/* eslint-disable */

import * as fs from 'fs'
import * as path from 'path'
interface FileResult {
  fileName: string;
  fileType: string;
  ctime: Date;
  mtime: Date;
}
interface overall {
  type: string,
  count: number
}
interface OneDirReadResultAll {
  nowPath: string;
  dir: OneDirReadResultAll[] & string[];
  file: FileResult[];
  overall: overall[]
}
interface SettingGetFile {
  regExp: RegExp[];
  fileType: string;
  isGet: boolean;
}

class GetDirStructure {
  constructor(
    basePath: string,
    userSetting: {
      changeDefaultGetFile: {
        fileType: string,
        replace: {
          regExp?: RegExp[];
          fileType?: string;
          isGet?: boolean;
        }
      }[],
      getFile: SettingGetFile[]
    } = { changeDefaultGetFile: [], getFile: [] }
  ) {
    this.basePath = basePath

    // chagne default setting
    userSetting.changeDefaultGetFile.forEach(item => {
      for (let i = 0; i < this.getFile.length; i++) {
        const getFile = this.getFile[i]
        if (getFile.fileType === item.fileType) {
          this.getFile[i] = { ...this.getFile[i], ...item.replace }
          break
        }
      }
    })

    // insert user.getFileSetting
    this.getFile = [...this.getFile, ...userSetting.getFile]
  }

  private basePath: string
  getFile: SettingGetFile[] =
    [
      {
        fileType: 'video',
        isGet: true,
        regExp: [/MPE?G$|MP(2|E|V)$/i, /ogg$/i, /webm$/i, /m4(p|v)$|mp4$/i, /avi$|wmv$|mov$|qt$|flv$|swf$|mkv$/i]
      },
      {
        fileType: 'audio',
        isGet: true,
        regExp: [/mp(3|4)$/i, /m4a$|flac$|wav$/i]
      },
      {
        fileType: 'picture',
        isGet: true,
        regExp: [/jp(e?)g$|gif$|png$/i]
      },
      {
        fileType: 'game',
        isGet: true,
        regExp: [/exe$/i]
      }
    ]

  fileTypeCheck(fileName: string): { isGet: boolean, type: string } {
    const getFileSetting = this.getFile

    let result = {
      type: '',
      isGet: false
    }
    let isLoopComplete = false

    for (const setting of getFileSetting) {
      for (const regExp of setting.regExp) {
        if (path.parse(fileName).ext.match(regExp)) {
          isLoopComplete = true
          if (setting.isGet) {
            result.type = setting.fileType
            result.isGet = true
          }
          break
        }
      }
      if (isLoopComplete) break
    }
    return result
  }

  promise_readDirStructure(): Promise<OneDirReadResultAll[]> {
    const readdir = async (readPath: string, rootPath: string): Promise<OneDirReadResultAll[]>  => {
      const overallAddByDir = (parent: overall[], child: overall[]): overall[] => {
        let parentMap = {
          type: parent.map(item => item.type),
          count: parent.map(item => item.count)
        }

        child.forEach(item => {
          const typeIndex = parentMap.type.indexOf(item.type)
          if (typeIndex !== -1) {
            parentMap.count[typeIndex] += item.count
          } else {
            parentMap.count.push(item.count)
            parentMap.type.push(item.type)
          }
        })

        let overallResult:overall[] = []
        parentMap.type.forEach((item, index) => {
          overallResult[index] = {
            type: item,
            count: parentMap.count[index]
          }
        })
        return overallResult
      }

      if ((readPath.split(path.sep).length - rootPath.split(path.sep).length) >= 15) throw new Error('File size is too larg')

      let listStrings: string[] = []
      let OneDirReadResult: OneDirReadResultAll = { nowPath: readPath, dir: [], file: [], overall: [] }

      try {
        listStrings = await fs.promises.readdir(readPath)
      } catch (err) {
        throw new Error(`first find error ${readPath}\n${err}`)
      }

      const nowDirChildDir = []
      for (const listString of listStrings) {
        let nowPath = path.resolve(readPath, listString)
        let nowStat = await fs.promises.stat(nowPath)

        if (!nowStat.isDirectory()) {
          let fileTypeResult = this.fileTypeCheck(listString)
          if (!fileTypeResult.isGet) continue

          OneDirReadResult.file.push(
            {
              fileName: listString,
              fileType: fileTypeResult.type,
              ctime: nowStat.ctime,
              mtime: nowStat.mtime
            }
          )

          OneDirReadResult.overall = overallAddByDir(OneDirReadResult.overall, [{type: fileTypeResult.type, count: 1}])

          if (fileTypeResult.type === 'game') {
            // if game Dir, ignore other files except match RegExp as game file
            OneDirReadResult.file = [OneDirReadResult.file[OneDirReadResult.file.length - 1]]
            OneDirReadResult.dir = []
            OneDirReadResult.overall = [{ type: 'game', count: 1 }]
            return [OneDirReadResult]
          }
        } else {
          nowDirChildDir.push(nowPath)
        }
      }

      for (const childDirPath of nowDirChildDir) {
        const childDir = await readdir(childDirPath, rootPath)
        OneDirReadResult.dir.push(...childDir)
        OneDirReadResult.overall = overallAddByDir(OneDirReadResult.overall, childDir[0].overall)
      }

      return [OneDirReadResult]
    }

    return readdir(this.basePath, this.basePath)
  }
}

export default GetDirStructure

/*
  this.promise_readDirStructure(depth: number = -1)
      -1 => result.dir contain all sub directory

  EX)
    /a
    /b
      /c
        /d
      /e

    depth == 1
    =>
    [
      {nowPath: '/a'},
      {nowPath: '/b'},
      {nowPath: '/b/c'},
      {nowPath: '/b/c/d'},
      {nowPath: '/b/e'}
    ]

    depth == 2
    =>
    [
      {nowPath: '/a'},
      {nowPath: '/b'},
      {nowPath: '/b/c', dir : [{nowpath: '/b/c/d'}]},
      {nowPath: '/b/e'}
    ]
*/
