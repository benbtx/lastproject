export function getCompanyPieData(url, data, callback) {
    $.ajax({
        headers: {
            'Authorization-Token': AppX.appConfig.usertoken
        },
        data: data,
        type: 'post',
        url: url,
        success: (result) => {
            if (result.result == null) return;
            callback({
                title: {
                    text: result.result.title +
                    ' (单位：' + result.result.unit + ')',
                    // subtext: '总计:' + (function (values) {
                    //     var sum = 0;
                    //     values.forEach((item, index) => { sum += item.value });
                    //     return sum.toFixed(2);
                    // })(result.result.items) + result.result.unit,
                    x: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: "{b} <br/>共 {c} " + result.result.unit +
                    "<br/>占比 {d}%"
                },
                label: {
                    normal: {
                        formatter: "{c}"
                    },
                    emphasis: {
                        formatter: "{c}"
                    }
                },
                legend: {
                    orient: 'vertical',
                    right: '1%',
                    bottom: "10%",
                    itemWidth: 15,
                    itemHeight: 10,
                    data: result.result.items.map(function (item) {
                        return breakString(item.groupname, 6, "\n")
                    })
                },
                series: [
                    {
                        name: result.result.type,
                        type: 'pie',
                        radius: '50%',
                        center: ['40%', '60%'],
                        data: result.result.items.map(function (item) {
                            return {
                                name: breakString(item.groupname, 6, "\n"),
                                value: item.value.toFixed(2)
                            }
                        }),
                        itemStyle: {
                            emphasis: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }
                ]
            });
        }
    });
}

export function getPipePieData(url, data, colors, callback) {
    $.ajax({
        headers: {
            'Authorization-Token': AppX.appConfig.usertoken
        },
        data: data,
        type: 'post',
        url: url,
        success: (result) => {
            if (result.result == null) return;
            callback({
                title: {
                    text: result.result.title +
                    ' (单位：' + result.result.unit + ')',
                    x: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: "{b} <br/>共 {c} " + result.result.unit +
                    "<br/>占比 {d}%"
                },
                label: {
                    normal: {
                        formatter: "{c}"
                    },
                    emphasis: {
                        formatter: "{c}"
                    }
                },
                legend: {
                    orient: 'vertical',
                    right: '1%',
                    bottom: "5%",
                    itemWidth: 15,
                    itemHeight: 10,
                    data: result.result.items.map(function (item) {
                        return item.groupname;
                    })
                },
                series: [
                    {
                        name: result.result.type,
                        type: 'pie',
                        radius: '50%',
                        center: ['40%', '60%'],
                        data: result.result.items.map(function (item, index) {
                            return {
                                // name: breakString(item.groupname, 6, "\n"),
                                name: item.groupname,
                                value: item.value.toFixed(2),
                                itemStyle: {
                                    normal: {
                                        color: colors[index]
                                    }
                                }
                            }
                        }),
                        itemStyle: {
                            emphasis: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }
                ]
            });
        }
    });
}

export function getPipeBarData(url, data, colors, callback) {
    $.ajax({
        headers: {
            'Authorization-Token': AppX.appConfig.usertoken
        },
        data: data,
        type: 'post',
        url: url,
        success: (result) => {
            if (result.result == null) return;
            callback({
                title: {
                    text: result.result.title +
                    ' (单位：' + result.result.unit + ')',
                    x: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: "{b} <br/>共 {c} " + result.result.unit +
                    "<br/>占比 {d}%"
                },
                label: {
                    normal: {
                        formatter: "{c}"
                    },
                    emphasis: {
                        formatter: "{c}"
                    }
                },
                legend: {
                    orient: 'vertical',
                    right: '1%',
                    bottom: "5%",
                    itemWidth: 15,
                    itemHeight: 10,
                    data: result.result.items.map(function (item) {
                        return item.groupname;
                    })
                },
                series: [
                    {
                        name: result.result.type,
                        type: 'pie',
                        radius: '50%',
                        center: ['40%', '60%'],
                        data: result.result.items.map(function (item, index) {
                            return {
                                // name: breakString(item.groupname, 6, "\n"),
                                name: item.groupname,
                                value: item.value.toFixed(2),
                                itemStyle: {
                                    normal: {
                                        color: colors[index]
                                    }
                                }
                            }
                        }),
                        itemStyle: {
                            emphasis: {
                                shadowBlur: 10,
                                shadowOffsetX: 0,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        }
                    }
                ]
            });
        }
    });
}

function breakString(string = "", count = 5, separator = ",") {
    // console.log(string);
    if (string.length > count) {
        return string.slice(0, count) + separator +
            breakString(
                string.slice(count, string.length),
                count,
                separator
            );
    } else {
        return string;
    }
}