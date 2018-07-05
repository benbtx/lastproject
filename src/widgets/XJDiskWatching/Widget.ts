import BaseWidget = require('core/BaseWidget.class');
declare var echarts;


export = XJDiskWatching;

class XJDiskWatching extends BaseWidget {
    baseClass = "widget-XJDiskWatching";


    popup;//
    pageIndex;//当前显示的为第几页
    pageSize;//每页显示的条数


    startup() {
        this.initHtml();

    }

    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();
        this.setHtml(html);
        this.ready();
        this.XJDiskWatchingInit();

    }
    destroy() {

        this.domObj.remove();
        this.afterDestroy();
    }

    XJDiskWatchingInit() {
        this.getDiskInfo(this.initDiskInfoPie.bind(this));
    }


    getDiskInfo(callback) {
        var config = this.config.getDiskInfo;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {},
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(result.message);
                } else if (result.result === "") {
                    toast.Show(config.MSG_Null);
                    return;
                } else {
                    var diskInfo = {
                        "total": result.result.total,//数据库总空间
                        "percent": result.result.percent,//数据库空间使用率
                        "used": result.result.available,//数据库空间使用量
                        "available": result.result.free//数据库空间可用量
                    }
                    callback(diskInfo);
                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    initDiskInfoPie(diskInfo) {
        var myChart = echarts.init($(".widget-XJDiskWatching .pieContainer")[0], 'macarons');


        var option = {
            title: {
                text: '服务器磁盘使用情况',
                left: '50%',
                top: '0%',
                textAlign: 'center',
                subtext: "总容量：" + parseFloat(diskInfo.total).toFixed(3) + "G",
                subtextStyle: {
                    color:'#67a7c3',
                    fontSize:16
                }
            },
            toolbox:{
                show:true,
                top: '10px',
                itemSize:20,
                feature:{
                    restore:{
                        show:true
                    },
                    saveAsImage:{
                        show:true
                    }
                }
            },
            tooltip: {
                trigger: 'item',
                formatter: "{b}：{c} G , 占比{d}%"
            },
            legend: {
                top: '10%',
                orient: "vertical",
                left: 'left',
                data: ['使用量', '剩余量']
            },
            series: [{
                type: 'pie',
                radius: '50%',
                center: ['55%', '50%'],
                data: [
                    { value: parseFloat(diskInfo.used).toFixed(3), name: "使用量" },
                    { value: parseFloat(diskInfo.available).toFixed(3), name: "剩余量" }
                ],
                itemStyle: {
                    emphasis: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0,0,0,0.5)'
                    }
                }
            }]

        }
        myChart.setOption(option);
    }



}