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
            if (data.length > 1) {
                save2CSV(data, fileName);
            } else {
                oneSave2CSV(data[0], fileName);
            }
            break;
        default:
            if (data.length > 1) {
                save2CSV(data, fileName);
            } else {
                oneSave2CSV(data[0], fileName);
            }
            break;
    }
}

// 存储为 CSV
function save2CSV(data: any, fileName?: string) {
    var result: string = "";
    var name = "工地台账列表";
    name += '-' + getDataTime();
    result += "公司,工地名称,监护人,监护状态,工地状态,工地地址,工地类型,创建时间,回报时间,未监护时间,告知书,日志";
    var state = "";
    var hanletroubleclear = "";
    for (var i = 0, j = data.length; i < j; i++) {
        result += "\n" + data[i][0] + "," + data[i][1] + "," + data[i][2] + "," + data[i][3] + "," + data[i][4] + "," + data[i][5] + "," + data[i][6] + "," + data[i][7] + "," + data[i][8] + "," + data[i][9].replace(/,/g, ";") + "," + data[i][10] + "," + data[i][11];

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

function oneSave2CSV(data: any, fileName?: string) {
    var result: string = "";
    var name = "工地台账基本信息";
    name += '-' + getDataTime();
    result += "施工单位,施工类型,施工负责人,施工负责人电话,建设单位,建设单位负责人,施工地址,经度,纬度,工地名称,监护人,监护人部门,指派时间";
    result += "\n" + data[0] + "," + data[1] + "," + data[2] + "," + data[3] + "," + data[4] + "," + data[5] + "," + data[6] + "," + data[7] + "," + data[8] + "," + data[9] + "," + data[10] + "," + data[11] + "," + data[12].split(" ")[0];
    //改变编码方式，以支持在低版本excel中打开--wangjiao--20170311
    var textEncoder = new CustomTextEncoder('gb18030', { NONSTANDARD_allowLegacyEncoding: true });
    var csvContentEncoded = textEncoder.encode([result]);
    var blob = new Blob([csvContentEncoded], { type: 'text/csv;charset=gb18030;' });
    saveAs(blob, name + ".csv");
}

export = Save2File;