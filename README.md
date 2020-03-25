# NODEJS MODULE GETFOLDERSTRUCTURE

## SEPC

1. nodejs >= 12.***

2. typescript and builded .js file

## HOW TO USE?

### new GetFolderStructure(folder, (option))


### get start


```
import GetFolderStructure from 'src/index.ts || dist/index.js'

let someFolderStructure = new GetFolderStructure('./somefolder')

someFolderStructure.promise_readFolderStructure().then(result => {
  console.log(result)
})
```

---

### default options setting


```
this = {
  getFile : [
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
    }
  ],
  userSetting: {
    getFile: []
  }
}
```

### options.getFile === (this.userSetting.getFile)

1. `[{here!}]`

- regExp: file extension match `regExp`

- fileType: set tag of file type `string`

- isGet: include in structure `boolean`

```
someFolder/
  0.png
  a/
    1.jpg
  b/
    video.mp4
    2.html


import GetFolderStructure from 'src/index.ts || dist/index.js'

let someFolderStructure = new GetFolderStructure('./somefolder', {
  getFile: [
    {
      regExp: /html$/i, isGet: true, fileType: 'html'
    }
  ]
})
someFolderStructure.getFile[2].regExp = [/png$/i]

someFolderStructure.promise_readFolderStructure().then(result => {
  console.log(result)
})
```

### then result is

```
{
  nowPath: './someFolder',
    dir: [
      {
        nowPath: './someFolder/a',
        dir: [],
        file: []
      },
      {
        nowPath: './someFolder/b',
        dir: [],
        file: [
          {
            fileName: 'video.mp4',
            fileType: 'video',
            ctime: 2020 - 03 - 25T13: 41: 06.321Z,
            mtime: 2017 - 06 - 18T06: 51: 24.000Z
          },
          {
            fileName: '2.html',
            fileType: 'html',
            ctime: 2020 - 03 - 25T13: 41: 06.321Z,
            mtime: 2017 - 06 - 18T06: 51: 24.000Z
          }
        ]
      }
    ],
    file: [
      {
        fileName: '0.png',
        fileType: 'picture',
        ctime: 2020 - 03 - 25T13: 41: 06.321Z,
        mtime: 2017 - 06 - 18T06: 51: 24.000Z
      }
    ]
}
```
