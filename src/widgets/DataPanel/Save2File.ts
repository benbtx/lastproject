declare var saveAs;
declare var CustomTextEncoder;

// 数据接口
interface DataTabs {
    title: string,
    id: string,
    canLocate: false,
    objectIDIndex: number,
    layerId: number,
    table: {
        thead: Array<string>,
        tbody: Array<Array<string | number>>
    }
}

const REPLACE_ARR = [
    [/&lt;空&gt;/g, ""],
    [/null/g, ""],
    [/,/g, "、"],
    [/\"/g, "\'"],
    [/\r\n/g, ""],
    [/\n/g, ""]
];

function Save2File(data: DataTabs, fileName?: string, fileType?: string) {

    switch (fileType) {
        case "csv":
            save2CSV(data, fileName);
            break;
        default:
            save2CSV(data, fileName);
    }
}

// 存储为 CSV
function save2CSV(data: DataTabs, fileName?: string) {
    var result: string;
    var name = fileName || data.title;
    name += '-' + getDataTime();
    result = data.table.thead.join(',');

    for (var i = 0, j = data.table.tbody.length; i < j; i++) {
        var pureData = data.table.tbody[i].map((item) => {
            return replacPaire(item, REPLACE_ARR);
        });
        result += "\n" + pureData.join(',');
    }
    
    //saveAs(new Blob([result], { type: "text/csv;charset=utf-8" }),
    //    name + ".csv");
    //改变编码方式，以支持在低版本excel中打开--wangjiao--20170311
    var textEncoder = new CustomTextEncoder('gb18030', { NONSTANDARD_allowLegacyEncoding: true });
    var csvContentEncoded = textEncoder.encode([result]);
    var blob = new Blob([csvContentEncoded], { type: 'text/csv;charset=gb18030;' });
    saveAs(blob, name + ".csv");
    //改变编码方式
}

function replacPaire(str: any, replaceArr: Array<Array<any>>) {
    str = "" + str;
    for (var i = 0, j = replaceArr.length; i < j; i++) {
        str = str.replace(replaceArr[i][0], replaceArr[i][1]);
    }

    return str;
}

function getDataTime() {
    var date = new Date();
    var resultArr = new Array();

    resultArr.push(date.getFullYear());
    resultArr.push(date.getMonth() + 1);
    resultArr.push(date.getDate());
    resultArr.push(date.getHours());
    resultArr.push(date.getMinutes());
    resultArr.push(date.getSeconds());
    resultArr.push(date.getMilliseconds());

    return resultArr.join('-');
}

export = Save2File;