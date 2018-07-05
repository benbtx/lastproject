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
                    }),
                },
                series: [
                    {
                        name: result.result.type,
                        type: 'pie',
                        radius: '50%',
                        center: ['40%', '60%'],
                        data: result.result.items.map(function (item, index) {
                            return {
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

export function getPipeBarData(url, data, callback) {
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
                    '(总计：' + (function (values) {
                        var sum = 0;
                        values.forEach((item, index) => { sum += item.value });
                        return sum.toFixed(0);
                    })(result.result.items) + result.result.unit + ')',
                    x: 'center',
                    y: '16'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: function (params) {
                        return params.name + "<br/>共 " +
                            params.data[1] + result.result.unit;
                    }
                },
                grid: {
                    left: 70,
                    right: 20,
                    y2: result.result.items.length > 24 ? 60 : 40
                },
                xAxis: {
                    data: result.result.items.map(function (item) {
                        return breakString(item.name, 6, "\n")
                    }),
                    axisTick: {
                        show: true,
                        interval: 0
                    },
                    axisLine: {
                        show: true
                    },
                    z: 5,
                    axisLabel: {
                        // rotate: 45,
                        rotate: result.result.items.length > 24 ? 45 : 0,
                        interval: 0
                    }
                },
                yAxis: {
                    axisLine: {
                        show: false
                    },
                    axisTick: {
                        show: false
                    },
                    axisLabel: {
                        textStyle: {
                            color: '#666'
                        }
                    }
                },
                dataZoom: [
                    {
                        type: 'inside'
                    }
                ],
                series: [
                    {
                        type: 'bar',
                        barWidth: "70%",
                        label: {
                            normal: {
                                show: true,
                                position: "top",
                                formatter: function (params) {
                                    return params.data[1];
                                }
                            }
                        },
                        itemStyle: {
                            normal: {
                                color: "#00b0f0"
                            },
                            emphasis: {
                                color: "#fc9600",
                                shadowBlur: 10,
                                shadowOffsetX: 5,
                                shadowColor: 'rgba(0, 0, 0, 0.5)'
                            }
                        },
                        data: result.result.items.map(function (item, index) {
                            return [index, item.value.toFixed(0), item.code, item.xzqcode];
                        })
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