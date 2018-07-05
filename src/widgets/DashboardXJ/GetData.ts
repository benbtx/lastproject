export function getCompanyPieData(url, data, callback) {
    $.ajax({
        headers: {
            'token': AppX.appConfig.xjxj,
            'departmentid': AppX.appConfig.departmentid,
            'range': AppX.appConfig.range
        },
        data: data,
        type: 'post',
        url: url,
        success: (result) => {
            if (result.code != 1) {
                console.error("终端状态接口错误!"+JSON.stringify(data)+result);
                AppX.runtimeConfig.toast.Show("终端状态接口错误!");
                return;
            }
            if (result.result == null) return;
            callback({
                title: {
                    text: result.result.title,
                    x: 'center'
                },
                tooltip: {
                    trigger: 'item',
                    formatter: "{b} <br/>共 {c} 个" +
                    "<br/>占比 {d}%"
                },
                label: {
                    normal: {
                        formatter: "{b}:{c}"
                    },
                    emphasis: {
                        formatter: "{b}:{c}"
                    }
                },
                legend: {
                    orient: 'vertical',
                    right: '1%',
                    bottom: "10%",
                    itemWidth: 15,
                    itemHeight: 10,
                    data: result.result.items.map(function (item) {
                        return breakString(item.name, 6, "\n")
                    })
                },
                series: [
                    {
                        name: result.result.type,
                        type: 'pie',
                        radius: '65%',
                        center: ['45%', '60%'],
                        data: result.result.items.map(function (item) {
                            return {
                                name: breakString(item.name, 6, "\n"),
                                value: item.value
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
            'token': AppX.appConfig.xjxj,
            'departmentid': AppX.appConfig.departmentid,
            'range': AppX.appConfig.range
        },
        data: data,
        type: 'post',
        url: url,
        success: (result) => {
            if (result.code != 1) {
                console.error("隐患统计接口错误!"+JSON.stringify(data)+result);
                AppX.runtimeConfig.toast.Show("隐患统计接口错误!");
                return;
            }
            if (!result.result || !result.result.items) return;
            callback(result, {
                tooltip: {
                    trigger: 'item',
                    formatter: "{b} <br/>共 {c} " + result.result.unit +
                    "<br/>占比 {d}%"
                },
                label: {
                    normal: {
                        formatter: "{b}:{c}",
                        position: "inside"
                    },
                    emphasis: {
                        formatter: "{b}:{c}",
                        position: "inside"
                    }
                },
                legend: {
                    orient: 'vertical',
                    right: '1%',
                    bottom: "5%",
                    itemWidth: 15,
                    itemHeight: 10,
                    data: result.result.items.map(function (item) {
                        return item.name;
                    }),
                },
                series: [
                    {
                        name: result.result.type,
                        type: 'pie',
                        radius: ['50%', '70%'],
                        center: ['35%', '60%'],
                        data: result.result.items.map(function (item, index) {
                            return {
                                name: item.name,
                                value: item.value,
                                itemStyle: {
                                    normal: {
                                        color: colors[index],
                                        label: {
                                            position: 'inside',
                                            textStyle: {
                                                baseline: 'bottom',
                                                color: "#333"
                                            }
                                        }
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
                    },
                    {
                        name: result.result.type + "处理状态",
                        type: 'pie',
                        radius: ['30%', '50%'],
                        center: ['35%', '60%'],
                        selectedMode: null,
                        silent: true,
                        data: (function (values) {
                            var sum = 0;
                            var handle = 0;
                            values.forEach((item, index) => { sum += item.value; handle += item.handle; });
                            var ratio = sum == 0 ? 0 : (100 * handle / sum).toFixed(0);
                            return [
                                {
                                    name: "已处理",
                                    value: handle,
                                    itemStyle: {
                                        normal: {
                                            color: "#92d050",
                                            label: {
                                                show: true,
                                                position: 'center',
                                                formatter: "已处理\n" + ratio + '%',
                                                textStyle: {
                                                    baseline: 'bottom',
                                                    color: "#92d050"
                                                }
                                            },
                                            labelLine: {
                                                show: false
                                            }
                                        }
                                    }
                                },
                                {
                                    name: "未处理",
                                    value: ratio == 0 ? 1 : sum - handle,
                                    itemStyle: {
                                        normal: {
                                            opacity: 0,
                                            label: {
                                                show: false
                                            },
                                            labelLine: {
                                                show: false
                                            }
                                        }
                                        , emphasis: {
                                            opacity: 0,
                                            label: {
                                                show: false
                                            },
                                            labelLine: {
                                                show: false
                                            }
                                        }
                                    }
                                }
                            ];
                        })(result.result.items),
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

export function getTodayXunjianData(url, data, colors, callback) {
    $.ajax({
        headers: {
            'token': AppX.appConfig.xjxj,
            'departmentid': AppX.appConfig.departmentid,
            'range': AppX.appConfig.range
        },
        data: data,
        type: 'post',
        url: url,
        success: (result) => {
            if (result.code != 1) {
                console.error("今日巡检接口错误!"+JSON.stringify(data)+result);
                AppX.runtimeConfig.toast.Show("今日巡检接口错误!");
                return;
            }
            if (result.result == null) return;
            callback(result, {
                title: {
                    show: false
                },
                tooltip: {
                    show: false
                },
                label: {
                    normal: {
                        show: false
                    },
                    emphasis: {
                        show: false
                    }
                },
                series: [
                    {
                        name: result.result.type,
                        type: 'pie',
                        hoverAmimation: false,
                        selectedOffset: 0,
                        silent: true,
                        radius: ['75%', '95%'],
                        center: ['50%', '50%'],
                        data: [{
                            name: 1,
                            value: 1,
                            itemStyle: {
                                normal: {
                                    color: "#ffffff",
                                    label: {
                                        show: false
                                    },
                                    labelLine: {
                                        show: false
                                    }
                                }
                            }
                        }]
                    },
                    {
                        name: result.result.type,
                        type: 'pie',
                        radius: ['45%', '75%'],
                        center: ['50%', '50%'],
                        hoverAmimation: false,
                        selectedOffset: 0,
                        silent: true,
                        data: (function (data) {
                            var handle = data.handlepoint + data.handleline;
                            var rest = data.planpoint + data.planline - handle;
                            var ratio = (data.planpoint + data.planline) == 0 ? 0 : (100 * handle / (data.planpoint + data.planline)).toFixed(0);
                            return [
                                {
                                    name: "已巡",
                                    value: handle,
                                    itemStyle: {
                                        normal: {
                                            color: "#0070c0",
                                            label: {
                                                show: true,
                                                position: 'center',
                                                formatter: "已巡\n" + ratio + '%',
                                                textStyle: {
                                                    baseline: 'bottom',
                                                    color: "#0070c0",
                                                    fontSize: 16,
                                                }
                                            },
                                            labelLine: {
                                                show: false
                                            }
                                        }
                                    }
                                },
                                {
                                    name: "未巡",
                                    value: ratio == 0 ? 1 : rest,
                                    itemStyle: {
                                        normal: {
                                            opacity: 0,
                                            label: {
                                                show: false
                                            },
                                            labelLine: {
                                                show: false
                                            }
                                        }
                                        , emphasis: {
                                            opacity: 0,
                                            label: {
                                                show: false
                                            },
                                            labelLine: {
                                                show: false
                                            }
                                        }
                                    }
                                }
                            ];
                        })(result.result.today),
                    }
                ]
            });
        }
    });
}

export function getTodayShebeiData(url, data,colors, callback) {
    $.ajax({
        headers: {
            'token': AppX.appConfig.xjxj,
            'departmentid': AppX.appConfig.departmentid,
            'range': AppX.appConfig.range
        },
        data: data,
        type: 'post',
        url: url,
        success: (result) => {
            if (result.code != 1) {
                console.error("今日设备巡查接口错误!"+JSON.stringify(data)+result);
                AppX.runtimeConfig.toast.Show("今日设备巡查接口错误!");
                return;
            }
            if (result.result == null) return;
            callback(result, {
                title: {
                    show: false
                },
                tooltip: {
                    show: false
                },
                label: {
                    normal: {
                        show: false
                    },
                    emphasis: {
                        show: false
                    }
                },
                series: [
                    {
                        name: result.result.type,
                        type: 'pie',
                        hoverAmimation: false,
                        selectedOffset: 0,
                        silent: true,
                        radius: ['75%', '95%'],
                        center: ['50%', '50%'],
                        data: [{
                            name: 1,
                            value: 1,
                            itemStyle: {
                                normal: {
                                    color: "#ffffff",
                                    label: {
                                        show: false
                                    },
                                    labelLine: {
                                        show: false
                                    }
                                }
                            }
                        }]
                    },
                    {
                        name: result.result.type,
                        type: 'pie',
                        radius: ['45%', '75%'],
                        center: ['50%', '50%'],
                        hoverAmimation: false,
                        selectedOffset: 0,
                        silent: true,
                        data: (function (data) {
                            var handle = data.handlepoint;
                            var rest = data.planpoint - handle;
                            var ratio = data.planpoint == 0 ? 0 : (100 * handle / data.planpoint).toFixed(0);
                            return [
                                {
                                    name: "已检",
                                    value: handle,
                                    itemStyle: {
                                        normal: {
                                            color: "#c55a11",
                                            label: {
                                                show: true,
                                                position: 'center',
                                                formatter: "已检\n" + ratio + '%',
                                                textStyle: {
                                                    baseline: 'bottom',
                                                    color: "#c55a11",
                                                    fontSize: 16,
                                                }
                                            },
                                            labelLine: {
                                                show: false
                                            }
                                        }
                                    }
                                },
                                {
                                    name: "未检",
                                    value: ratio == 0 ? 1 : rest,
                                    itemStyle: {
                                        normal: {
                                            opacity: 0,
                                            label: {
                                                show: false
                                            },
                                            labelLine: {
                                                show: false
                                            }
                                        }
                                        , emphasis: {
                                            opacity: 0,
                                            label: {
                                                show: false
                                            },
                                            labelLine: {
                                                show: false
                                            }
                                        }
                                    }
                                }
                            ];
                        })(result.result.today),
                    }
                ]
            });
        }
    });
}

export function getTodayGongdiData(url, data, colors, callback) {
    $.ajax({
        headers: {
            'token': AppX.appConfig.xjxj,
            'departmentid': AppX.appConfig.departmentid,
            'range': AppX.appConfig.range
        },
        data: data,
        type: 'post',
        url: url,
        success: (result) => {
            if (result.code != 1) {
                console.error("今日工地监护接口错误!"+JSON.stringify(data)+result);
                AppX.runtimeConfig.toast.Show("今日工地监护接口错误!");
                return;
            }
            if (result.result == null) return;
            callback(result, {
                title: {
                    show: false
                },
                tooltip: {
                    show: false
                },
                label: {
                    normal: {
                        show: false
                    },
                    emphasis: {
                        show: false
                    }
                },
                series: [
                    {
                        name: result.result.type,
                        type: 'pie',
                        hoverAmimation: false,
                        selectedOffset: 0,
                        silent: true,
                        radius: ['75%', '95%'],
                        center: ['50%', '50%'],
                        data: [{
                            name: 1,
                            value: 1,
                            itemStyle: {
                                normal: {
                                    color: "#ffffff",
                                    label: {
                                        show: false
                                    },
                                    labelLine: {
                                        show: false
                                    }
                                }
                            }
                        }]
                    },
                    {
                        name: result.result.type,
                        type: 'pie',
                        radius: ['45%', '75%'],
                        center: ['50%', '50%'],
                        hoverAmimation: false,
                        selectedOffset: 0,
                        silent: true,
                        data: (function (data) {
                            var handle = data.closed;
                            var rest = data.upload - handle;
                            var ratio = data.upload == 0 ? 0 : (100 * data.closed / data.upload).toFixed(0);
                            return [
                                {
                                    name: "完成监护",
                                    value: handle,
                                    itemStyle: {
                                        normal: {
                                            color: "#007434",
                                            label: {
                                                show: true,
                                                position: 'center',
                                                formatter: "完成\n" + ratio + '%',
                                                textStyle: {
                                                    baseline: 'bottom',
                                                    color: "#007434",
                                                    fontSize: 16,
                                                }
                                            },
                                            labelLine: {
                                                show: false
                                            }
                                        }
                                    }
                                },
                                {
                                    name: "未完成监护",
                                    value: ratio == 0 ? 1 : rest,
                                    itemStyle: {
                                        normal: {
                                            opacity: 0,
                                            label: {
                                                show: false
                                            },
                                            labelLine: {
                                                show: false
                                            }
                                        }
                                        , emphasis: {
                                            opacity: 0,
                                            label: {
                                                show: false
                                            },
                                            labelLine: {
                                                show: false
                                            }
                                        }
                                    }
                                }
                            ];
                        })(result.result.all),
                    }
                ]
            });
        }
    });
}