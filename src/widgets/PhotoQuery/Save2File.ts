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

function Save2File(data: any, fileName?: string, fileType?: string) {

    switch (fileType) {
        case "csv":
            save2CSV(data, fileName);
            break;
        default:
            save2CSV(data, fileName);
    }
}

// 存储为 CSV
function save2CSV(data: any, fileName?: string) {
    var result: string = "";
    var name = "照片列表";
    name += '-' + getDataTime();
    result += "照片类型,地址,描述,上报人,上报时间,公司名称";
    var state = "";
    var hanletroubleclear = "";
    for (var i = 0, j = data.length; i < j; i++) {
        state = "";
        hanletroubleclear = "";



        result += "\n" + data[i].pic_type_name + "," + data[i].address + "," + data[i].description.trim() + "," + data[i].upload_username + "," + data[i].create_time + "," + data[i].company_name;

    }

    // saveAs(new Blob([result], { type: "text/plain;charset=utf-8" }),
    //     name + ".csv");

    //改变编码方式，以支持在低版本excel中打开--wangjiao--20170311
    var textEncoder = new CustomTextEncoder('gb18030', { NONSTANDARD_allowLegacyEncoding: true });
    var csvContentEncoded = textEncoder.encode([result]);
    var blob = new Blob([csvContentEncoded], { type: 'text/csv;charset=gb18030;' });
    saveAs(blob, name + ".csv");
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