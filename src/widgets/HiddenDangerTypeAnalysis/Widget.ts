import BaseWidget = require('core/BaseWidget.class');
import Functions =require('core/Functions.module');
declare var echarts;
export = HiddenDangerTypeAnalysis;


class HiddenDangerTypeAnalysis extends BaseWidget {
    baseClass = "widget-hiddendangertypeanalysis";
    toast = null;
    popup = null;
    loadWait=null;
    companyid = "";//公司id
    iszgs=false;//是否是总公司账号  
    ispartment=false;//是否为部门账号
    
    Chart = null;
    ChartOption = null;

    hiddendangertypeanalysis_begindate = "";
    hiddendangertypeanalysis_enddate = "";

    chartdata = [];
    alllayersbardata;//所有当前查询图层的柱状图图层数组：每个对象包含一个图层名和柱状图数据对象（bar_dataZoom-bar_yAxis等属性）
    curpage=null;//导出数据

    html = ``;
    dpartid='';

    start = {
            format: 'YYYY-MM-DD',           
            isinitVal:true,
            choosefun: function(elem, val, date){
                var dt=new Date(val.replace(/-/g,"/"));
                this.end.minDate=Functions.DateFormat(dt,"yyyy-MM-dd");                
            }.bind(this)
        };
     end = {
            format: 'YYYY-MM-DD',
            isinitVal:true,
            minDate:"2017-08-08"
        };


    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }
    
    initHtml() {
        var html = _.template(this.template)();
        this.setHtml(html);
        this.ready();
    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.loadWait=this.AppX.runtimeConfig.loadWait;
    }

    /**
     * @function 判断是否为集团账号或子公司账号
     */
    initCompany(){
        if(AppX.appConfig.groupid!=null && AppX.appConfig.groupid!=""){
            this.ispartment=true;
        }
        
        if(this.ispartment==false){
            if(AppX.appConfig.range.indexOf(";")>-1){
                var codes=AppX.appConfig.range.split(";");
                if(codes!=null && codes.length>0){
                    for(var i=0;i<codes.length;i++){
                        if(codes[i]==this.config.rangeall){
                            this.iszgs=true;
                            break;
                        }
                    }
                }  
            }else{
                if(AppX.appConfig.range==this.config.rangeall){
                    this.iszgs=true;
                }
            } 
        }       
    }

    /**
     * @function 根据登录账号（集团公司账号、子公司账号、部门账号）初始化
     */
    initLoginUser(){   
        this.initCompany();    
        this.initTableHtml();    
        if(this.iszgs==true){//集团公司账号
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
        }else{            
            this.domObj.find(".company_serch").hide();
            if(this.ispartment){
                this.dpartid=AppX.appConfig.groupid;//获取部门id
                this.domObj.find(".department_btn").hide();
            }else{
                this.getGroup();//查询部门及员工列表信息
            }          
        }
    }

    /**
     * @function 初始化报表页面模板
     */
    initTableHtml(){
        if(this.iszgs){
            this.domObj.find(".table-caption").empty().append('<div class="cxgs" style="float:left;">公司：</div><div class="titcaption" style="float:right;">查询日期：</div>'); 
        }else{
            this.domObj.find(".table-caption").empty().append('<div class="titcaption" style="float:left;">查询日期：</div>');            
        }
    }


    /**
     * @function 根据不同账号获取headers
     * @param type 0获取自己及以下部门数据，1获取自身数据
     */
    getHeaders(type?:number){
        var headers=null;
        switch(type){
            case 0:
                headers={                
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                    'range':AppX.appConfig.range
                };
                break;
            case 1:
                headers={                
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid
                };
                break;
            default:
                headers={                
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
            success: function(results){                
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
                this.companyid=(this.iszgs==true?this.domObj.find(".company option:selected").val():"");
                if(this.companyid==""){
                    this.domObj.find(".department").prop("disabled",true);
                }else{
                    this.domObj.find(".department").prop("disabled",false);
                }
                //this.getGroup();//查询部门及员工列表信息            
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    initEvent() {        
        $.jeDate(".hiddendangertypeanalysis_begindate",this.start);
        $.jeDate(".hiddendangertypeanalysis_enddate",this.end);
        var sdate=new Date(),edate=new Date();
        this.end.minDate=Functions.DateFormat(sdate,"yyyy-MM-dd");
        this.domObj.find('.hiddendangertypeanalysis_begindate').val(Functions.DateFormat(sdate,"yyyy-MM-dd"));
        this.domObj.find('.hiddendangertypeanalysis_enddate').val(Functions.DateFormat(edate,"yyyy-MM-dd"));
        this.initLoginUser();

        //查询
        this.domObj.find('.btn_search').on("click", function () {
            this.hiddendangertypeanalysis_begindate = this.domObj.find('.hiddendangertypeanalysis_begindate').val();
            this.hiddendangertypeanalysis_enddate = this.domObj.find('.hiddendangertypeanalysis_enddate').val();
            if(this.ispartment==false)
                this.dpartid=this.domObj.find(".department option:selected").val();
           
            if (this.hiddendangertypeanalysis_begindate == "") {
                this.toast.Show("开始时间不能为空！");
                return;
            }

            if (this.hiddendangertypeanalysis_begindate == "") {
                this.toast.Show("结束时间不能为空！");
                return;
            }

            if (new Date(this.hiddendangertypeanalysis_begindate).getTime() - new Date(this.hiddendangertypeanalysis_enddate).getTime() > 0) {               
                this.toast.Show("开始时间不能大于结束时间！");
                return;
            }
            
            //查询分析结果
            this.getHiddenDangerTypeAnalysis();

        }.bind(this));

        //打印
        this.domObj.find('.btn_print').on("click", function () {
            (<any>$(".hiddendangertypeinfo-list")).print({                    
                    globalStyles: false,
                    mediaPrint: false,
                    stylesheet: "widgets/HiddenDangerTypeAnalysis/css/style.css",
                    iframe: true,
                    noPrintSelector: ".no-print",
                    prepend: "",
                    append: ""
                });   
        }.bind(this));

        //导出excel
        this.domObj.find('.btn_export').on("click", function () { 
           mothedexport_hiddendangertypeinfo();
        }.bind(this));
    }
   
    getHiddenDangerTypeAnalysis() {
        this.hiddendangertypeanalysis_begindate = this.domObj.find('.hiddendangertypeanalysis_begindate').val();
        this.hiddendangertypeanalysis_enddate = this.domObj.find('.hiddendangertypeanalysis_enddate').val();
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj);
        this.curpage=null;
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerTypeAnalysis,
            data: {
                "start_date": this.hiddendangertypeanalysis_begindate ,
                "end_date": this.hiddendangertypeanalysis_enddate,
                "depid":this.dpartid,
                "companyid":this.companyid
            },
            success: this.getHiddenDangerTypeAnalysisCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getHiddenDangerTypeAnalysisCallback(results) {
        this.loadWait.Hide();
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        this.chartdata = [];
        this.html = ``;
        if(results.result.length>0){
             var allTatal=0;            
             for (var i = 0; i < results.result.length; i++) {
                 var info=results.result[i].info;
                 var totalCount=0;
                 for(var j=0;j<info.length;j++){
                    totalCount+=info[j].trouble_type_num;
                 }
                 results.result[i].total=totalCount;
                 allTatal+=totalCount;
             }
             results.total=allTatal;
        } 
        
        //赋值
        for (var i = 0; i < results.result.length; i++) {//隐患类型集合
            var robj=results.result[i];            
            var spanlen=robj.info.length;
            var backgroundColor = "#eeeeee";
            if (i % 2 == 0) {
                backgroundColor = "white"
            }
            for (var j = 0; j < spanlen; j++) {//设备类型集合                
                var equid_percent=(robj.info[j].trouble_type_num==0?'0.00%':(robj.info[j].trouble_type_num/robj.total*100.0).toFixed(2)+'%');
                if (j == 0) {
                    this.html += '<tr style="background-color:' + backgroundColor + '"> <td rowspan="'
                    +spanlen
                    +'">'+(i + 1)
                    +'</td><td>'
                    +robj.info[j].trouble_type_name
                    +'</td><td rowspan="'
                    +spanlen
                    +'">'
                    +robj.device_type_name
                    +'</td><td>'
                    +robj.info[j].trouble_type_num
                    +'</td><td>'
                    +equid_percent
                    +'</td><td rowspan="'
                    +spanlen
                    +'">'
                    +robj.total
                    +'</td><td rowspan="'
                    +spanlen
                    +'">'
                    +(robj.total==0?'0.00%':(robj.total/results.total*100).toFixed(2)+'%') 
                    +'</td></tr>';                   
                } else {
                    this.html += '<tr style="background-color:' + backgroundColor + '"><td>'
                    +robj.info[j].trouble_type_name
                    +'</td><td>'
                    +robj.info[j].trouble_type_num
                    +'</td><td>'+equid_percent
                    +'</td></tr>';                   
                }               
             }
            var typeTotal=(robj.total==0?0.00:(robj.total/results.total*100).toFixed(2));
            //隐患类型图例绘制
            this.chartdata.push({ xvalue: robj.device_type_name, yvalue: typeTotal });
        }
        //合计
        var tot=0;
        if(results.result.length>0){
            tot=results.total;
        }
        var totalBackgroundColor = "#eeeeee ";
        if ((results.result.length) % 2 == 0) {
            totalBackgroundColor = "white"
        }
        this.html += '<tr  style="background-color:' + totalBackgroundColor + '"><td colspan=5>合计</td><td>'
        +tot+'</td><td></td></tr>';

        this.domObj.find(".hiddendangertypeanalysis").empty().append(this.html);
        if(this.iszgs){
            this.domObj.find(".cxgs").text("公司：" + this.domObj.find(".company option:selected").text());
        }
        this.domObj.find(".titcaption").text("查询日期：" + this.hiddendangertypeanalysis_begindate + "~" + this.hiddendangertypeanalysis_enddate);
        var myDate = new Date();
        var mytime=Functions.DateFormat(myDate,"yyyy年MM月dd日 hh:mm:ss");            
        this.domObj.find(".shenhe").text("审核人：");
        this.domObj.find(".zhibiao").text("制表人："+AppX.appConfig.realname);
        this.domObj.find(".shijian").text("制表时间：" + mytime);
        this.curpage=this.domObj.find('.hiddendangertypeinfo-list').html();
        //console.log(this.curpage);
        //默认绘制饼状图
        if(this.chartdata.length>0){
            this.domObj.find('.HiddenDangerTypeAnalysischart').show();
            this.configChart("pie","HiddenDangerTypeAnalysischart",'隐患类型分析图（'+this.hiddendangertypeanalysis_begindate + '~' + this.hiddendangertypeanalysis_enddate+'）');
        }else{
            this.domObj.find('.HiddenDangerTypeAnalysischart').hide();
        }           
            
    }

    /**
     * 饼状图参数设置
     */
    setPieChart(){
        var tooltip = {
            trigger: 'item',
            formatter: "{b}"//"{a} <br/>{b} : {c} ({d}%)"
        }
        var serise = {
            name: '',
            type: 'pie',
            radius: '70%',
            center: ['50%', '60%'],
            data: [],
            label:{
                normal:{
                    textStyle:{
                        fontSize:16
                    }
                }
            },
            itemStyle: {
                emphasis: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.8)'
                }
            }
        }
        var piedata = [];
        for (var i = 0; i < this.chartdata.length; i++) {
                piedata.push({ value: this.chartdata[i].yvalue, name: this.chartdata[i].xvalue+'：'+this.chartdata[i].yvalue+'%' });
        }
        serise.data = piedata;

        //删除对象对象属性
        delete this.ChartOption.dataZoom;
        delete this.ChartOption.grid;
        delete this.ChartOption.xAxis;
        delete this.ChartOption.yAxis;
        this.ChartOption.tooltip = tooltip;
        this.ChartOption.series = serise;
        this.Chart.setOption(this.ChartOption, true);
    }

    /**
     * 柱状图或折线图参数设置
     */
    setBarOrLineChart(seriesName,chartType){
        var xdata = [];//x坐标显示
        this.chartdata.forEach(function (item) {
            xdata.push(item.xvalue.trim());
        });  
        var tooltip={
            trigger: 'axis'
        };
        var grid={ // 控制图的大小，调整下面这些值就可以，
            x: 60,
            x2: 100,
            y2: 100,// y2可以控制 X轴跟Zoom控件之间的间隔，避免以为倾斜后造成 label重叠到zoom上
        };
        var series = [
                        {
                            name: seriesName,
                            type: chartType,
                            data: [],
                            barWidth: 25,//柱图宽度                               
                            label: {
                                    normal: {
                                        show: true,
                                        position: 'top',
                                        textStyle:{
                                            fontSize:16
                                        }
                                    }
                            },
                            itemStyle: {
                                    normal: {
                                        color: 'rgba(0, 0, 255, 0.8)'
                                    }
                            
                            }
                        }
        ];
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
                                    rotate: 30,//60度角倾斜显示
                                }
                            }
        ];
        var yAxis= [
                            {
                                type: 'value',
                                name: '隐患类型比例(%)',
                            }
        ];

        series[0].data = [];
        this.chartdata.forEach(function (item) {           
            series[0].data.push(item.yvalue);
        }); 
        this.ChartOption.grid = grid;
        this.ChartOption.series = series;
        this.ChartOption.tooltip = tooltip;
        this.ChartOption.xAxis = xAxis;
        this.ChartOption.yAxis = yAxis;
        this.Chart.setOption(this.ChartOption, true);
    }

    /**
     * @function 绘制统计图
     * @param chartType{"pie","bar","line"}
     * @param divClass 放置chart位置div的class名称
     * @param title 图形标题
     */
    configChart(chartType,divClass,title) {       
        var chartid = this.domObj.find("."+divClass);
        chartid.width(chartid.parent().css("width"));
        chartid.height(420);
        this.Chart = echarts.init(chartid[0], 'macarons');

        this.ChartOption={
                        title: {
                            text:title,
                            left:'50%',
                            top:'0%',
                            textAlign:'center'
                        },
                        toolbox: {
                            show: true,
                            right: '15',
                            itemSize:'24',
                            feature: {
                                mark: { show: true },                    
                                magicType: { show: true, type: [] },
                                //饼图
                                myTool1: {
                                    show: true,
                                    title: '饼图',
                                    icon: 'image://./widgets/HiddenDangerTypeAnalysis/images/pie.png',
                                    onclick: function () {                            
                                        this.setPieChart();
                                    }.bind(this)
                                },
                                //柱状图
                                myTool2: {
                                    show: true,
                                    title: '柱状图',
                                    icon: 'image://./widgets/HiddenDangerTypeAnalysis/images/bar.png',
                                    onclick: function () {
                                       this.setBarOrLineChart("隐患类型比例","bar");
                                    }.bind(this)
                                },
                                //折线图
                                myTool3: {
                                    show: true,
                                    title: '折线图',
                                    icon: 'image://./widgets/HiddenDangerTypeAnalysis/images/line.png',
                                    onclick: function () {
                                        this.setBarOrLineChart("隐患类型比例","line");
                                    }.bind(this)
                                },
                                restore: { show: true },
                                saveAsImage: { show: true }
                            }
                        },
                        calculable: true,
                        
        };
        this.setPieChart();       
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

    /**
     * 销毁对象
     */
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }
}