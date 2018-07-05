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
    var name = "隐患列表";
    name += '-' + getDataTime();
    result += "隐患名称,隐患类型,上报人员,地址,巡检片区,上报时间,公司名称,是否为隐患,级别,状态";
    var state = "";
    var hanletroubleclear = "";
    for (var i = 0, j = data.length; i < j; i++) {
        state = "";
        hanletroubleclear = "";

        if (data[i].handle_trouble_clear == 0) {
            hanletroubleclear = "未清除";
        } else if (data[i].handle_trouble_clear == 1) {
            hanletroubleclear = "已清除";
        }

        if (data[i].state == 0) {
            state = "否";
            hanletroubleclear = "无需清除";

        } else if (data[i].state == 1) {
            state = "是";
        } else {
            state = "";
            hanletroubleclear = "";
        }
        //  "," + data[i].handle_before_notes.trim() +
        if (data[i].regionname.trim() != "") {
            if (data[i].regionname.trim().substring(0, 1) == "0") {
                result += "\n" + data[i].trouble_name + "," + data[i].trouble_type_name + "," + data[i].username + "," + data[i].address + ",'" + data[i].regionname + "," + data[i].uploadtime + "," + data[i].company_name + "," + state + "," + data[i].level_name + "," + data[i].process_name;


            } else {
                result += "\n" + data[i].trouble_name + "," + data[i].trouble_type_name + "," + data[i].username + "," + data[i].address + "," + data[i].regionname + "," + data[i].uploadtime + "," + data[i].company_name + "," + state + "," + data[i].level_name + "," + data[i].process_name;

            }
        } else {
            result += "\n" + data[i].trouble_name + "," + data[i].trouble_type_name + "," + data[i].username + "," + data[i].address + "," + data[i].regionname + "," + data[i].uploadtime + "," + data[i].company_name + "," + state + "," + data[i].level_name + "," + data[i].process_name;

        }

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