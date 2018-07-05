/*
var 最终数据格式 = {
    tabs: [
        {
            title: "",
            id: "",
            canLocate: false,
            objectIDIndex: 0,
            layerId: 0,
            table: {
                thead: [],
                tbody: [
                    []
                ]
            }
        }
    ]
}
*/

const nullValue = "&lt;空&gt;";

// 数据转表格格式
export = function Data2Table(data) {
    switch (true) {
        case (data === undefined || data === null):
            // 数据为空
            console.error("DataPanel Data2Table 数据不能为空");
            return false;
        case (data.code !== undefined):
            // 数据为 SOE
            if (data.result !== undefined && data.result.rows !== undefined &&
                data.result.rows.length > 0) {
                return makeSOEData(data.result);
            }
            return false
        case (data.features !== undefined):
            // 数据为 Query 结果
            if (data.title != undefined && data.id != undefined) {
                return makeQueryData(data);
            }
            return false;
        case (data.tabs !== undefined && data.tabs.length > 0 &&
            data.tabs[0].features !== undefined):
            // 混合数据
            return makeHybridData(data);
        case (data.tabs !== undefined):
            return data;
    }
}

/*
原数据格式
{
    "result": {
        "rows": [
            {
                "rows": [
                    {
                        "MATERIAL": "钢资",
                        "SHAPE.LEN": 17387.82
                    },
                    {
                        "MATERIAL": "PE管",
                        "SHAPE.LEN": 188.63
                    }
                ],
                "layerid": 13,
                "layername": "高压管线"
            }
        ]
    },
    "code": 10000,
    "message": "成功"
}
*/

// 将 SOE 数据转换为标准数据格式
function makeSOEData(data) {
    var result = { tabs: null };

    result.tabs = new Array();

    // 制作 tab
    for (var i = 0, j = data.rows.length; i < j; i++) {
        var tab = {
            title: data.rows[i].layername,
            id: data.rows[i].layerid,
            canLocate: false,
            objectIDIndex: 0,
            layerId: data.rows[i].layerid,
            table: {
                thead: [],
                tbody: []
            }
        }

        // 构造 thead
        var count = 0;
        for (var key in data.rows[0].rows[0]) {
            if (key === "OBJECTID") {
                tab.canLocate = true;
                tab.objectIDIndex = count;
            }
            tab.table.thead.push(key);
            count++;
        }

        // 构造 tbody
        for (var n = 0, m = data.rows[i].rows.length; n < m; n++) {
            var trData = data.rows[i].rows[n];
            var tr = [];
            for (var key in trData) {
                if (trData[key] === undefined || trData[key] === "" ||
                    trData[key] === "Null") {
                    tr.push(nullValue);
                } else {
                    tr.push(trData[key]);
                }
            }

            tab.table.tbody.push(tr);
        }

        result.tabs.push(tab);
    }

    return result;
}

// 将ArcGIS 数据格式化
// 原数据格式
/*
{
    title: "",
    id: "",
    layerId: 0,
    features: [],
    fieldAliases?: Object
}
*/
function makeQueryData(data) {

    var result = { tabs: null };

    result.tabs = new Array();

    var tab = {
        title: data.title,
        id: data.id,
        canLocate: false,
        objectIDIndex: 0,
        layerId: data.layerId,
        urlindex:data.urlindex,
        table: {
            thead: [],
            tbody: []
        }
    }

    // 构造 thead
    var count = 0;
    if (data.fieldAliases !== undefined) {
        for (var key in data.fieldAliases) {
            if (key === "OBJECTID") {
                tab.canLocate = true;
                tab.objectIDIndex = count;
            }
            if (data.fieldAliases[key] === undefined) {

                tab.table.thead.push(nullValue);
            } else {
                tab.table.thead.push(data.fieldAliases[key]);
            }
            count++;
        }
    } else {
        for (var key in data.features[0].attributes) {
            if (key === "OBJECTID") {
                tab.canLocate = true;
                tab.objectIDIndex = count;
            }
            tab.table.thead.push(key);
            count++;
        }
    }

    // 构造 tbody
    // var newDate = new Date();
    for (var n = 0, m = data.features.length; n < m; n++) {
        var trData = data.features[n].attributes;
        var tr = [];
        for (var key in trData) {
            if (trData[key] === undefined || trData[key] === "" ||
                trData[key] === "Null") {
                tr.push(nullValue);
            } else {
                tr.push(trData[key]);
            }
        }
        tab.table.tbody.push(tr);
    }

    result.tabs.push(tab);

    return result;
}

// 处理混合数据
// 原数据格式
/*
{
    tabs: [
        {
            title: "",
            id: "",
            layerId: 0,
            features: [],
            fieldAliases?: Object
        }
    ]
}

*/
function makeHybridData(data) {
    for (var i = 0, j = data.tabs.length; i < j; i++) {
        data.tabs[i] = (makeQueryData(data.tabs[i])).tabs[0];
    }
    return data;
}