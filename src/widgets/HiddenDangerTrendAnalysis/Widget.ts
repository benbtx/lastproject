import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');
declare var echarts;

export = HiddenDangerTrendAnalysis;

class HiddenDangerTrendAnalysis extends BaseWidget {
    baseClass = "widget-hiddendangertrendanalysis";

    toast = null;
    popup = null;
    loadWait = null;
    companyid = "";//公司id
    dpartid="";//部门id
    iszgs = false;//是否是总公司账号
    ispartment = false;

    Chart = null;
    ChartOption = null;

    starttime_year = "";
    starttime_month = "";
    endtime_year = "";
    endtime_month = "";

    starttime = "";
    endtime = "";

    chartdata = [];//存储饼状或折线图数据
    piechartdata = [];//类型分析数据

    html = ``;
    tit = ``;
    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }

    initHtml() {
        var html = _.template(this.template)();
        this.setHtml(html);
        this.ready();
        //初始化日期控件（pensiveant）
        this.initDateWeight();
    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.loadWait = this.AppX.runtimeConfig.loadWait;
    }

    /**
     * @function 判断是否为集团账号或子公司账号
     */
    initCompany() {
        //if (AppX.appConfig.groupid != null && AppX.appConfig.groupid != "") {
           // this.ispartment = true;
        //}

        if (this.ispartment == false) {
            if (AppX.appConfig.range.indexOf(";") > -1) {
                var codes = AppX.appConfig.range.split(";");
                if (codes != null && codes.length > 0) {
                    for (var i = 0; i < codes.length; i++) {
                        if (codes[i] == this.config.rangeall) {
                            this.iszgs = true;
                            break;
                        }
                    }
                }
            } else {
                if (AppX.appConfig.range == this.config.rangeall) {
                    this.iszgs = true;
                }
            }
        }
    }

    /**
     * @function 根据登录账号（集团公司账号、子公司账号、部门账号）初始化
     */
    initLoginUser() {
        this.initCompany();
        this.initTableHtml();
        if (this.iszgs == true) {//集团公司账号
            this.domObj.find(".company_serch").show();
            this.getCompanyList();
            this.domObj.find('.company').on("change", function () {
                this.companyid=this.domObj.find(".company option:selected").val(); 
                if(this.companyid==""){
                    this.domObj.find(".department").prop("disabled",true);
                }else{
                    this.domObj.find(".department").prop("disabled",false);
                }
                this.getGroup(); 
            }.bind(this));
        } else {            
            this.domObj.find(".company_serch").hide();            
            if(this.ispartment){
                this.dpartid=AppX.appConfig.groupid;//获取部门id
                this.domObj.find(".department_btn").hide();
            }else{
                this.getGroup();//查询部门及员工列表信息
            }
            this.getHiddenDangerTrendAnalysis(); 
        }
    }

    /**
     * @function 初始化报表页面模板
     */
    initTableHtml() {
        if (this.iszgs) {
            this.domObj.find(".table-caption").empty().append('<div class="cxgs" style="float:left;">公司：</div><div class="titcaption" style="float:right;">查询日期：</div>');
        } else {
            this.domObj.find(".table-caption").empty().append('<div class="titcaption" style="float:left;">查询日期：</div>');
        }
    }


    /**
     * @function 根据不同账号获取headers
     * @param type 0获取自己及以下部门数据，1获取自身数据
     */
    getHeaders(type?: number) {
        var headers = null;
        switch (type) {
            case 0:
                headers = {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                    'range': AppX.appConfig.range
                };
                break;
            case 1:
                headers = {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid
                };
                break;
            default:
                headers = {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid
                };
                break;
        }
        return headers;
    }

    /**
     * @function 获取公司列表信息
     */
    getCompanyList() {
        $.ajax({
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getCompanyList,
            success: function (results) {
                var that = this;
                if (results.code != 1) {
                    that.toast.Show(results.message);
                    return;
                }
                var strdepartment = "<option value=''>全部</option>";
                $.each(results.result, function (index, item) {
                    //if(AppX.appConfig.departmentid==item.companyid){
                    //strdepartment += "<option selected value='" + item.companyid + "'>" + item.company_name + "</option>";
                    //}else{
                    strdepartment += "<option value='" + item.companyid + "'>" + item.company_name + "</option>";
                    //}   
                }.bind(this));
                this.domObj.find(".company").empty().append(strdepartment);
                this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
                this.getGroup(); 
                this.getHiddenDangerTrendAnalysis();
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    startdate = {
        format: 'YYYY-MM', //日期格式  
        isinitVal: true,
        maxDate: Functions.DateFormat(new Date(), "yyyy-MM"),
        choosefun: function (elem, val) {
            var dt = new Date(val.replace(/-/g, "/") + '/01');
            this.enddate.minDate = Functions.DateFormat(dt, "yyyy-MM-dd");
        }.bind(this)
    }

    enddate = {
        format: 'YYYY-MM', //日期格式  
        isinitVal: true,
        maxDate: Functions.DateFormat(new Date(), "yyyy-MM"),
        minDate: Functions.DateFormat(new Date(), "yyyy-MM")
    }
    //初始化日期控件（pensiveant）
    initDateWeight() {
        $.jeDate(".hiddendangertrendinfo-search input.startdate", this.startdate);
        $.jeDate(".hiddendangertrendinfo-search input.enddate", this.enddate);

        var sdate = new Date((new Date()).getFullYear() + "/01/01"), edate = new Date();
        this.domObj.find('.startdate').val(Functions.DateFormat(sdate, "yyyy-MM"));
        this.domObj.find('.enddate').val(Functions.DateFormat(edate, "yyyy-MM"));
    }

    initEvent() {
        this.starttime = this.domObj.find('.startdate').val();
        this.endtime = this.domObj.find('.enddate').val();
        this.initLoginUser();

        this.domObj.find('.btn_search').on("click", function () {
            this.starttime = this.domObj.find('.startdate').val();
            this.endtime = this.domObj.find('.enddate').val();
            if (new Date(this.starttime).getTime() - new Date(this.endtime).getTime() > 0) {
                this.toast.Show("开始时间不能大于结束时间！");
                return;
            }

            //查询分析结果
            this.getHiddenDangerTrendAnalysis();
        }.bind(this));

        //打印
        this.domObj.find('.btn_add').on("click", function () {
            (<any>$(".hiddendangertrendinfo-list")).print({
                globalStyles: false,
                mediaPrint: false,
                stylesheet: "widgets/HiddenDangerTrendAnalysis/css/style.css",
                iframe: true,
                noPrintSelector: ".no-print",
                prepend: "",
                append: ""
            });
        }.bind(this));

        //导出excel
        this.domObj.find('.btn_export').on("click", function () {
            mothedexport_hiddendangertrend();
        }.bind(this));
    }


    getHiddenDangerTrendAnalysis() {
        this.starttime = this.domObj.find('.startdate').val();
        this.endtime = this.domObj.find('.enddate').val();
        this.loadWait.Show("正在查询数据，请耐心等待...", this.domObj);
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerTypeAnalysis,
            data: {
                "start_date": this.starttime,
                "end_date": this.endtime,
                "companyid": this.companyid,
                "deptid":this.dpartid
            },
            success: this.getHiddenDangerTrendAnalysisCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getHiddenDangerTrendAnalysisCallback(results) {
        this.loadWait.Hide();
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        this.html = '';
        var mouth_nums = [];//统计每月
        this.chartdata = [];//存储折线或饼状数据
        this.piechartdata = [];
        var isnum_data = [];
        if (results.result.length > 0) {//计算每一类隐患总计
            var allTatal = 0;
            for (var i = 0; i < results.result.length; i++) {
                var info = results.result[i].info;
                this.domObj.find(".titcaption").attr("colspan",info.length);
                this.domObj.find(".shenhe").attr("colspan",(info.length-3));
                var totalCount = 0;//单类总和
                for (var j = 0; j < info.length; j++) {
                    totalCount += info[j].num;
                    if (mouth_nums.length > j) {
                        mouth_nums[j] += info[j].num;
                    } else {
                        mouth_nums.push(info[j].num);
                    }

                }
                if (totalCount != 0) {
                    this.chartdata.push({ xvalue: results.result[i].trouble_type_name, yvalue: info });
                    isnum_data.push(results.result[i]);
                }

                results.result[i].total = totalCount;
                allTatal += totalCount;
            }
            results.total = allTatal;
            if (isnum_data.length > 0) {
                results.result = isnum_data;
                this.addTitle(results.result[0].info);//添加标题

                //趋势统计
                for (var i = 0; i < results.result.length; i++) {
                    var reobj = results.result[i];
                    var info = reobj.info;
                    var html_percent = '';
                    var backgroundColor = "#eeeeee";
                    if (i % 2 == 0) {
                        backgroundColor = "white"
                    }
                    this.html += '<tr style="background-color:' + backgroundColor + '"><td rowspan="2">'
                        + (i + 1)
                        + '</td><td rowspan="2">'
                        + reobj.trouble_type_name
                        + '<td>数量</td><td>'
                        + reobj.total
                        + '</td>';
                    html_percent += '<tr style="background-color:' + backgroundColor + '"><td>比例</td><td>'
                        + (results.total == 0 ? '0.00%' : (reobj.total / results.total * 100).toFixed(2) + '%')
                        + '</td>';
                    for (var j = 0; j < info.length; j++) {
                        this.html += '<td>' + info[j].num + '</td>';//个数
                        html_percent += '<td>' + (mouth_nums[j] == 0 ? '0.00%' : (info[j].num / mouth_nums[j] * 100).toFixed(2) + '%') + '</td>';
                    }
                    this.html += '</tr>' + html_percent + "</tr>";
                }
            } else {
                this.addTitle(results.result[0].info);//添加标题
            }

            //统计每月
            var totalBackgroundColor = "#eeeeee ";
            if ((results.result[0].info.length) % 2 == 0) {
                totalBackgroundColor = "white"
            }
            this.html += '<tr><td class="tdcenter" colspan="2" rowspan="2">合计</td><td>数量</td><td>'
                + results.total
                + '</td>';
            var all_html_percent = '';
            all_html_percent += '<tr><td>比例</td><td>100.00%</td>';
            for (var i = 0; i < mouth_nums.length; i++) {
                all_html_percent += '<td>' + (results.total == 0 ? '0.00%' : (mouth_nums[i] / results.total * 100).toFixed(2) + '%') + '</td>';
                this.html += '<td>' + mouth_nums[i] + '</td>';
            }
            this.html += '</tr>' + all_html_percent + "</tr>";

        }
        this.domObj.find(".hiddendangertrendanalysis").empty().append(this.html);
        if (this.iszgs) {
            this.domObj.find(".cxgs").text("公司：" + this.domObj.find(".company option:selected").text());
        }
        this.domObj.find(".titcaption").text("查询日期：" + this.starttime + "~" + this.endtime);

        var myDate = new Date();
        var mytime = Functions.DateFormat(myDate, "yyyy年MM月dd日 hh:mm:ss");
        this.domObj.find(".shenhe").text("审核人：");
        this.domObj.find(".zhibiao").text("制表人：" + AppX.appConfig.realname);
        this.domObj.find(".shijian").text("制表时间：" + mytime);

        //会煮柱状图
        if (this.chartdata.length > 0) {
            this.domObj.find(".HiddenDangerTrendAnalysischart").show();
            this.configChart("line", "HiddenDangerTrendAnalysischart", '隐患趋势分析图（' + this.starttime + '~' + this.endtime + '）');
        } else {
            this.domObj.find(".HiddenDangerTrendAnalysischart").hide();
        }

    }

    /**
     * 添加标题
     */
    addTitle(info) {
        var theadHtml = '<tr class="tit"><th>序号</th><th>隐患类型</th><th></th> <th>小计</th>';
        if (info.length > 0) {
            for (var i = 0; i < info.length; i++) {
                theadHtml += "<th>" + info[i].month_name + "</th>";
            }
        }
        theadHtml += "</tr>";
        this.domObj.find(".theadtrendanalysis").empty().append(theadHtml);
    }


    /**
     * 柱状图或折线图参数设置
     */
    setBarOrLineChart(seriesName, chartType) {
        var xdata = [], legenddata = ["全部"];//x坐标显示
        this.chartdata.forEach(function (item) {
            legenddata.push(item.xvalue.trim());//类型名为图例
        });

        if (this.chartdata.length > 0 && this.chartdata[0].yvalue.length > 0) {
            var info = this.chartdata[0].yvalue;
            for (var i = 0; i < info.length; i++) {
                xdata.push(info[i].month_name.trim());//年月为x坐标
            }
        }

        var tooltip = {
            trigger: 'axis'
        };
        var grid = { // 控制图的大小，调整下面这些值就可以，
            x: 60,
            x2: 100,
            y2: 100,// y2可以控制 X轴跟Zoom控件之间的间隔，避免以为倾斜后造成 label重叠到zoom上            
        };
        var legend = {
            left: 'center',
            y: 'bottom',
            data: legenddata,
            textStyle: {
                fontSize: 15
            }
        };
        var series = [];
        var xAxis = [
            {
                type: 'category',
                data: xdata.map(function (str) {
                    if (str.indexOf(" ") > 0) {
                        return str.replace(/\s+/g, "\n")
                    }
                    return str
                }),
                axisLabel: {
                    interval: 0,////横轴信息全部显示
                    rotate: 0,//60度角倾斜显示
                }
            }
        ];
        var yAxis = [
            {
                type: 'value',
                name: '隐患类型数量(个)',
                nameTextStyle:{
                    fontSize:15
                }
            }
        ];


        this.chartdata.forEach(function (item) {
            var infos = item.yvalue;
            var serie = {
                name: item.xvalue.trim(),
                type: chartType,
                data: [],
                label: {
                    normal: {
                        show: true,
                        position: 'top'
                    }
                }
            }
            for (var i = 0; i < infos.length; i++) {
                serie.data.push(infos[i].num)
            }
            series.push(serie);
        });
        this.ChartOption.grid = grid;
        this.ChartOption.series = series;
        this.ChartOption.tooltip = tooltip;
        this.ChartOption.xAxis = xAxis;
        this.ChartOption.yAxis = yAxis;
        this.ChartOption.legend = legend;
        this.Chart.setOption(this.ChartOption, true);
    }


    /**
     * @function 绘制统计图
     * @param chartType{"pie","bar","line"}
     * @param divClass 放置chart位置div的class名称
     * @param title 图形标题
     */
    configChart(chartType, divClass, title) {
        var chartid = this.domObj.find("." + divClass);
        chartid.width(chartid.parent().css("width"));
        chartid.height(540);
        this.Chart = echarts.init(chartid[0], 'macarons');

        this.ChartOption = {
            title: {
                text: title,
                left: '50%',
                top: '0%',
                textAlign: 'center'
            },
            toolbox: {
                itemSize: 24,
                show: true,
                right: '15',
                feature: {
                    mark: { show: true },
                    magicType: { show: true, type: [] },
                    //柱状图
                    myTool2: {
                        show: true,
                        title: '柱状图',
                        icon: 'image://./widgets/HiddenDangerTypeAnalysis/images/bar.png',
                        onclick: function () {
                            this.setBarOrLineChart("隐患类型数量（个）", "bar");
                        }.bind(this)
                    },
                    //折线图
                    myTool3: {
                        show: true,
                        title: '折线图',
                        icon: 'image://./widgets/HiddenDangerTypeAnalysis/images/line.png',
                        onclick: function () {
                            this.setBarOrLineChart("隐患类型数量（个）", "line");
                        }.bind(this)
                    },
                    restore: { show: true },
                    saveAsImage: { show: true }
                }
            },
            calculable: true,

        };
        this.setBarOrLineChart("隐患类型数量（个）", "line");
    }

    /**
     * 获取部门信息
     */
    getGroup() {

        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "companyid":this.companyid
            },
            success: this.getGroupListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getGroupListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }

        var department = this.domObj.find(".department").empty();
        var strdepartment = "<option value=''>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";
        }.bind(this));
        department.append(strdepartment);
    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }
}