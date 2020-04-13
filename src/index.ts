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
  dir: OneDirReadResultAll[];
  file: FileResult[];
  overall: overall[]
}
interface SettingGetFile {
  regExp: RegExp[];
  fileType: string;
  isGet: boolean;
}

class GetFolderStructure {
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

  promise_readFolderStructure(resultFolderDepth: number = -1) {
    const readdir = async (readPath: string, rootPath: string): Promise<OneDirReadResultAll>  => {
      const overallAddByFolder = (parent: overall[], child: overall[]): overall[] => {
        const parentMap = {
          type: parent.map(item => item.type),
          count: parent.map(item => item.count)
        }
        let result = parent

        child.forEach(item => {
          const typeIndex = parentMap.type.indexOf(item.type)
          if (typeIndex !== -1) {
            result[typeIndex].count += item.count
          } else {
            result.push(item)
          }
        })

        return result
      }

      if ((readPath.split(path.sep).length - rootPath.split(path.sep).length) >= 15) throw new Error('File size is too larg')

      let listStrings: string[] = []
      let result: OneDirReadResultAll = { nowPath: readPath, dir: [], file: [], overall: [] }

      try {
        listStrings = await fs.promises.readdir(readPath)
      } catch (err) {
        throw new Error(`first find error ${readPath}\n${err}`)
      }

      const nowFolderChildDir = []
      for (const listString of listStrings) {
        let nowPath = path.resolve(readPath, listString)
        let nowStat = await fs.promises.stat(nowPath)

        if (!nowStat.isDirectory()) {
          let fileTypeResult = this.fileTypeCheck(listString)
          if (!fileTypeResult.isGet) continue

          result.file.push(
            {
              fileName: listString,
              fileType: fileTypeResult.type,
              ctime: nowStat.ctime,
              mtime: nowStat.mtime
            }
          )

          const checkOverall = result.overall.filter(item => item.type === fileTypeResult.type)
          if (!checkOverall.length) result.overall.push({ type: fileTypeResult.type, count: 1 })
          else {
            result.overall = result.overall.map(item => {
              if (item.type === fileTypeResult.type) ++item.count
              return item
            })
          }

          if (fileTypeResult.type === 'game') {
            // if game folder, ignore other files except match RegExp as game file
            result.file = [result.file[result.file.length - 1]]
            result.dir = []
            result.overall = [{ type: 'game', count: 1 }]
            return result
          }
        } else {
          nowFolderChildDir.push(nowPath)
        }
      }

      for (const nowPath of nowFolderChildDir) {
        const childDir = await readdir(nowPath, rootPath)
        result.dir.push(childDir)
        result.overall = overallAddByFolder(result.overall, childDir.overall)
      }
      return result
    }

    return readdir(this.basePath, this.basePath)
  }
}

export default GetFolderStructure
