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

function Save2File(data: any,fileName?: string, fileType?: string) {

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
    var name = "设备列表";
    name += '-' + getDataTime();
    result += "唯一编号,设备编码,设备类型,所在区县,设施状态,地址,最近检修时间";
    console.log(data);
    data.forEach((p, itemindx) => {
        if(p.attributes.SUBTYPE==10000){
            p.attributes.SUBTYPE='阀室';
        }
        result += "\n" +p.attributes.SID+","+ p.attributes.CODE + "," +p.attributes.SUBTYPE + "," + p.attributes.DISTRICT_XZQ+ "," + p.attributes.STATUS + "," + p.attributes.ADDR+ "," + p.attributes.nearest_repairedate;
    });
    var textEncoder = new CustomTextEncoder('gb18030', { NONSTANDARD_allowLegacyEncoding: true });
    var csvContentEncoded = textEncoder.encode([result]);

    saveAs(new Blob([csvContentEncoded], { type: 'text/csv;charset=gb18030;' }),
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