/* eslint-disable */

import * as fs from 'fs'
import * as path from 'path'
interface FileResult {
  fileName: string;
  fileType: string;
  ctime: Date;
  mtime: Date;
}
interface OneDirReadResultAll {
  nowPath: string;
  dir: OneDirReadResultAll[];
  file: FileResult[];
  overall: {
    type: string,
    count: number
  }[]
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
        regExp: [/MPE?G$|MP(2|E|V)$/i, /ogg$/i, /webm$/i, /m4(p|v)$|mp4$/i, /avi$|wmv$|mov$|qt$|flv$|swf$/i]
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

  promise_readFolderStructure() {
    const readdir = async (readPath: string) => {
      let listStrings: string[] = []
      let result: OneDirReadResultAll = { nowPath: readPath, dir: [], file: [], overall: [] }

      try {
        listStrings = await fs.promises.readdir(readPath)
      } catch (err) {
        throw new Error(`first find error ${readPath}\n${err}`)
      }

      for (const listString of listStrings) {
        let nowPath = path.resolve(readPath, listString)
        let nowStat = await fs.promises.stat(nowPath)

        if (nowStat.isDirectory()) {
          result.dir.push(await readdir(nowPath))
        } else {
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
        }
      }
      return result
    }

    return readdir(this.basePath)
  }
}

export default GetFolderStructure
