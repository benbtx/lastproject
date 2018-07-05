import BaseWidget = require('core/BaseWidget.class');
import Functions =require('core/Functions.module');
export = VehicleWarnInfoStatistics;

class VehicleWarnInfoStatistics extends BaseWidget {
    baseClass = "widget-VehicleWarnInfoStatistics";
    toast = null;
    popup = null;
    loadWait=null;
    companyid = "";//公司id
    iszgs=false;//是否是总公司账号  
    ispartment=false;//是否为部门账号
    html="";
    search_obj={
        depid:"",
        carid:"",
        alarm_type_id:"",
        start_date:"",
        end_date:""
    }

    /**
     * @function 启动
     */
    startup() {
        this.configure();
        this.initHtml();        
        this.initLoginUser();
        this.initEvent();
    }

    /**
     * @function 配置
     */
    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;   
        this.loadWait=this.AppX.runtimeConfig.loadWait;    
    }

    /**
     * @function 页面初始化
     */
    initHtml() {
        var html = _.template(this.template.split('$$')[0])();
        this.setHtml(html);
        this.ready();
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
     * @function 初始化报表页面模板
     */
    initTableHtml(){
        if(this.iszgs){
            this.domObj.find(".warninfo-search").empty().append(this.template.split('$$')[1]);
            this.domObj.find(".warninfocaption").empty().append('<div class="cxgs" style="float:left;">公司：</div><div class="cxqj" style="float:right;">查询日期：</div>'); 
        }else{
            this.domObj.find(".warninfo-search").empty().append(this.template.split('$$')[2]);
            this.domObj.find(".warninfocaption").empty().append('<div class="cxqj" style="float:left;">查询日期：</div>');            
        }
    }

    /**
     * @function 根据登录账号（集团公司账号、子公司账号、部门账号）初始化
     */
    initLoginUser(){           
        this.initCompany();  
        this.initTableHtml(); 
        this.initTimeControl();
        this.getSysConfig(this.config.alarmtypekey,this.domObj.find(".alarm_type_id"),true);//  
        this.search_obj.start_date=this.domObj.find(".start_date").val();
        this.search_obj.end_date=this.domObj.find(".end_date").val();
        if(this.iszgs==true){//集团公司账号            
            this.getCompanyList();
            //部门列表
            this.domObj.find('.company').on("change", function () {  
                this.companyid=this.domObj.find(".company option:selected").val();             
                this.getGroup(true,this.domObj.find(".department"));//部门列表               
            }.bind(this));  
        }else{
            if(this.ispartment){
                this.search_obj.depid=AppX.appConfig.groupid;//获取部门id
                this.domObj.find(".department_btn").hide();
                this.getCarList(true,this.domObj.find(".plate_number"));//车辆列表 
            }else{
                this.getGroup(true,this.domObj.find(".department"));//查询部门及员工列表信息
            }
            this.getReportCarAlarm();        
        }
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
                var strdepartment = "";//"<option value=''>全部</option>";
                $.each(results.result, function (index, item) {                    
                    if(AppX.appConfig.departmentid==item.companyid){
                        strdepartment += "<option selected value='" + item.companyid + "'>" + item.company_name + "</option>";
                    }else{
                        strdepartment += "<option value='" + item.companyid + "'>" + item.company_name + "</option>";
                    }   
                }.bind(this));
                this.domObj.find(".company").empty().append(strdepartment);
                this.companyid=this.domObj.find(".company option:selected").val();
                this.getGroup(true,this.domObj.find(".department"));//查询部门及员工列表信息 
                this.getReportCarAlarm();            
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    start = {
            format: 'YYYY-MM-DD',           
            isinitVal:true,             
            choosefun: function(elem, val, date){
                var dt=new Date(val.replace(/-/g,"/"));
                this.end.minDate=Functions.DateFormat(dt,"yyyy-MM-dd");             
                this.domObj.find('.end_date').val(this.end.minDate);
            }.bind(this)
        };

    end = {
        format: 'YYYY-MM-DD', //日期格式  
        isinitVal: true,
        minDate:Functions.DateFormat(new Date(),"yyyy-MM-dd")
    };

    /**
     * @function 初始化时间控件
     */
    initTimeControl(){
        $.jeDate(".start_date",this.start);
        $.jeDate(".end_date",this.end);
        //var dt=new Date();
        //dt.setDate(dt.getDate()-30);
        //this.domObj.find(".start_date").val(Functions.DateFormat(dt,"yyyy-MM-dd"));
    }

    /**
     * @function 设置查询条件
     */
    setSearchContent(){
        this.search_obj={
            depid:(this.ispartment==false?this.domObj.find(".department option:selected").val():AppX.appConfig.groupid),
            carid:this.domObj.find(".plate_number option:selected").val(),
            alarm_type_id:this.domObj.find(".alarm_type_id option:selected").val(),
            start_date:this.domObj.find(".start_date").val(),
            end_date:this.domObj.find(".end_date").val()
        }  
    }
    

    /**
     * @function 初始化事件
     */
    initEvent() {
        //查询
        this.domObj.find('.btn_search').on("click", function () {
            var edt=new Date(this.domObj.find(".end_date").val().replace(/-/g,"/"));
            var sdt=new Date(this.domObj.find(".start_date").val().replace(/-/g,"/"));
            if(sdt.getTime()-edt.getTime()>0){
                 this.toast.Show("结束日期不得早于开始日期!");
                 return;
            }
            this.setSearchContent();        
            this.getReportCarAlarm();
        }.bind(this));

        //打印
        this.domObj.find('.btn_print').on("click", function () {           
            (<any>$(".warninfo-list")).print({                    
                    globalStyles: false,
                    mediaPrint: false,
                    stylesheet: "widgets/VehicleWarnInfoStatistics/css/style.css",
                    iframe: true,
                    noPrintSelector: ".no-print",
                    prepend: "",
                    append: ""
                });
        }.bind(this));

        //导出
        this.domObj.find('.btn_export').on("click", function () { 
           mothedexport();
        }.bind(this));

        this.domObj.find('.department').on("change", function () {  
            this.search_obj.depid=this.domObj.find(".department option:selected").val();             
            this.getCarList(true,this.domObj.find(".plate_number"));//车辆列表               
        }.bind(this));
    }

    /**
     * @function 车辆报警统计
     */
    getReportCarAlarm() {
        this.loadWait.Show("正在查询数据,请耐心等待...",this.domObj);
        $.ajax({
            headers:this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getReportCarAlarm,
            data: {
                "q_start_date": this.search_obj.start_date,
                "q_end_date": this.search_obj.end_date,
                "deptid": this.search_obj.depid,
                "carid":this.search_obj.carid,
                "alarm_type_id":this.search_obj.alarm_type_id,
                "companyid":this.companyid
            },
            success: this.getReportCarAlarmCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getReportCarAlarmCallback(results) {        
        var that = this;
        if (results.code != 1) {
            this.loadWait.Hide();
            that.toast.Show(results.message);
            return;
        }       
        var data = results.result;
        this.html="";        
        if(data!=null && data.rows.length>0){
            for(var i=0;i<data.rows.length;i++){
                var row=data.rows[i];
                var len=row.caralarm?row.caralarm.length:0;
                this.html+="<tr><td rowspan='"+row.alarm_types_total+"'>"+row.dept
                        +"</td><td rowspan='"+row.alarm_types_total+"'>"+row.alarmcount_total 
                        +"</td>";
                for(var j=0;j<len;j++){
                    var typerow=row.caralarm[j].alarm_types;//类型
                    var typelen=typerow?typerow.length:0;
                    if(j==0){
                        this.html+="<td rowspan='"+typelen+"'>"+row.caralarm[j].car+"</td>";
                    }else{
                        this.html+="<tr><td rowspan='"+typelen+"'>"+row.caralarm[j].car+"</td>"; 
                    }
                    
                    if(typelen>0){
                        this.html+="<td>"+typerow[0].alarm_type
                                +"</td><td>"+typerow[0].alarm_type_count
                                +"</td><td rowspan='"+typelen+"'>"+row.caralarm[j].caralarm_count
                                +"</td></tr>";
                    }else{
                        this.html+="<td></td><td></td><td rowspan='"+typelen+"'>"+row.caralarm[j].caralarm_count
                                 +"</td></tr>";
                    }
                    for(var k=1;k<typelen;k++){                           
                        this.html+="<tr><td>"+typerow[k].alarm_type+"</td>"
                                +"<td>"+typerow[k].alarm_type_count+"</td></tr>";
                    }
                      
                }
                if(len==0){
                    this.html+="<td></td><td></td><td></td><td></td></tr>";
                }
                               
            }
        }
        if(this.iszgs){
            this.domObj.find(".cxgs").text("公司："+this.domObj.find(".company option:selected").text());
        }
        this.domObj.find(".cxqj").text("查询日期："+this.domObj.find(".start_date").val()+"~"+this.domObj.find(".end_date").val());            
        this.domObj.find(".warninfostatistcslist").empty().append(this.html); 
        var myDate = new Date();
        var mytime=Functions.DateFormat(myDate,"yyyy年MM月dd日 hh:mm:ss");            
        this.domObj.find(".shenhe").text("审核人：");
        this.domObj.find(".zhibiao").text("制表人："+AppX.appConfig.realname);
        this.domObj.find(".shijian").text("制表时间：" + mytime);  
        this.loadWait.Hide();          
    }

    /**--------------------------查询字典---------------------*/
    /**
     * @function 部门列表
     * @param isall 是否显示全部
     * @param obj 对象
     */
    getGroup(isall,obj) {
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "companyid":this.companyid
            },
            success: function(results){
                var that = this;
                if (results.code != 1) {
                    that.toast.Show(results.message);
                    return;
                }
                var strdepartment = "";
                if(isall==true){
                    strdepartment="<option value=''>全部</option>"
                }
                $.each(results.result.rows, function (index, item) {
                    strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";
                }.bind(this));
                obj.empty().append(strdepartment);
                this.search_obj.depid=this.domObj.find(".department option:selected").val();             
                this.getCarList(true,this.domObj.find(".plate_number"));//车辆列表 
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json"
        });
    }

    /**
     * @function 获取车辆列表
     * @param isall
     * @param obj
     */
    getCarList(isall,obj){
        $.ajax({
                headers: this.getHeaders(0),
                type: "POST",                
                dataType: "json",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleList,
                data: {
                    "pageindex": 1,
                    "pagesize": this.config.maxsize,
                    "depid":this.search_obj.depid,
                    "companyid":this.companyid
                },
                success: function (result) {
                    if (result.code != 1) {
                        this.toast.Show(result.message);
                        return;
                    }
                    var stroption = "<option value=''>全部</option>";
                    if(isall==false){
                        stroption="";
                    }
                    result.result.rows.forEach(function (row) {                       
                        stroption += "<option value='" + row.id + "'>" + row.plate_number + "</option>";                                           
                    }.bind(this));
                    obj.empty().append(stroption);
                }.bind(this),
                error: function (data) {
                    this.popup.ShowTip("服务端ajax出错，获取数据失败!");
                }.bind(this)
            });
    } 

     /**
     * @function 获取字典表信息
     * @param obj
     * @param isall
     */
    getSysConfig(key,obj,isall){
        $.ajax({
                headers: this.getHeaders(1),
                type: "POST",                
                dataType: "json",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getConfigList,
                data: {
                    "pageindex": 1,
                    "pagesize": this.config.maxsize,
                    "key":key
                },
                success: function (result) {
                    if (result.code != 1) {
                        this.toast.Show(result.message);
                        return;
                    }
                    var stroption = (isall==true?"<option value=''>全部</option>":"");
                    result.result.rows.forEach(function (row) {                     
                        stroption += "<option value='" + row.id + "'>" + row.value + "</option>";                       
                    }.bind(this));
                    obj.empty().append(stroption);
                }.bind(this),
                error: function (data) {
                    this.popup.ShowTip("服务端ajax出错，获取数据失败!");
                }.bind(this)
            });
    }    

    /**
     * @function 销毁对象
     */
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }   
}