declare var saveAs;

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
    var name = "隐患列表";
    name += '-' + getDataTime();
    result += "设备名称,隐患设备名称,隐患类型,备注,上报人员,是否处理,隐患是否清除,地址,发现时间";

    for (var i = 0, j = data.length; i < j; i++) {

        // result += "\n" + pureData.join(',');
        result += "\n" + data[i].padname + "," + data[i].equid_name + "," + data[i].trouble_type_name + "," + data[i].notes + "," + data[i].username + "," + data[i].handle_state + "," + data[i].handle_trouble_clear + "," + data[i].address + "," + data[i].uploadtime;
    }

    saveAs(new Blob([result], { type: "text/plain;charset=utf-8" }),
        name + ".csv");
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