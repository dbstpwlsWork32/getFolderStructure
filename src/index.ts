import * as fs from "fs"
import * as path from "path"

interface fileResult {
  fileName: string;
  fileType: string;
  ctime: Date;
  mtime: Date;
}
interface oneDirReadResult_all {
  nowPath: string;
  dir: oneDirReadResult_all[];
  file: fileResult[];
  existType: string[];
}

interface setting_getFile {
  regExp: RegExp[];
  fileType: string;
  isGet: boolean
}
interface userSetting {
  getFile: setting_getFile[]
}

class GetFolderStructure {
  constructor(basePath: string, userSetting?: userSetting) {
    this.basePath = basePath
    this.userSetting = { ...this.userSetting, ...userSetting }
  }

  private basePath: string;
  getFile: setting_getFile[] =
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
        regExp: [/swf$|exe$/i]
      }
    ]
  userSetting: userSetting = { getFile: [] }

  fileTypeCheck(fileName: string): { isGet: boolean, type: string } {
    let getFileSetting = [
      ...this.userSetting.getFile,
      ...this.getFile
    ]

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
    const readdir = async (readPath: string, prevPath?: string) => {
      let listStrings: string[] = []
      let result: oneDirReadResult_all = { nowPath: readPath, dir: [], file: [], existType: [] }

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
              mtime: nowStat.mtime,
            }
          )
          if (!result.existType.includes(fileTypeResult.type)) {
            result.existType.push(fileTypeResult.type)
          }
        }
      }
      return result
    }

    return readdir(this.basePath)
  }
}

export default GetFolderStructure