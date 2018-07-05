import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');
export = XJloginStatisitics;
class XJloginStatisitics extends BaseWidget {
    baseClass = "widget-XJloginStatisitics";
    toast = null;
    popup = null;
    loadWait=null; 
    companyid = "";//公司id
    iszgs=false;//是否是总公司账号  
    ispartment=false;//是否为部门账号
    html="";
    isinit=true;
    search_obj={
        depid:"",
        userid:"",
        date:""
    };
    days=0;

    weekday=["日","一","二","三","四","五","六"];//["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];
    /**
     * 根据时间产生标题
     */
    addTitle(){
        var sdt=new Date(this.search_obj.date.replace(/-/g,"/"));
        var year=sdt.getFullYear();
        var mouth=sdt.getMonth()+1;
        var ndt=new Date();
        this.days=0;
        if(mouth==2){
            this.days=year % 4==0?29:28;
        }else if(mouth==1 ||mouth ==3 ||mouth==5|| mouth==7|| mouth==8||mouth==10||mouth==12){
            this.days=31;
        }else{
            this.days=30;
        }  

        if((ndt.getMonth()+1)==mouth){//查询的是当前月，只显示到今天
            this.days=ndt.getDate();
        }    
        if(this.days>0){
            var trHtml='<th>人员名称</th><th></th>';
            sdt.setDate(1);
            for(var i=1;i<=this.days;i++){                
                var dateStr=Functions.DateFormat(sdt,"MM月dd日");
                var dwStr=this.weekday[sdt.getDay()];
                var cStr=i+"</br>("+dwStr+")";//dateStr+"\n"+dwStr; 
                trHtml+="<th>"+cStr+"</th>";
                sdt=new Date( sdt.getTime() + 24*1*60*60*1000);
            }
            this.html+=trHtml;
        }
    } 


    /**
     * @function 启动初始化
     */
    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }

    /**
     * @function 初始化页面
     */
    initHtml() {
        var html = _.template(this.template.split("$$")[0])();
        this.setHtml(html);
        this.ready();        
    }

    /**
     * @function 配置初始化
     */
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
            this.domObj.find(".xjloginstatisiticslist").empty().append(this.template.split("$$")[1]);
            this.getCompanyList();
            //部门列表
            this.domObj.find('.company').on("change", function () {  
                this.companyid=(this.iszgs==true?this.domObj.find(".company option:selected").val():"");             
                this.getGroup(true,this.domObj.find(".department"));               
            }.bind(this));  
        }else{            
            this.domObj.find(".company_serch").hide();
            if(this.ispartment){
                this.search_obj.depid=AppX.appConfig.groupid;//获取部门id
                this.domObj.find(".department_btn").hide();
                this.getUser(true,this.domObj.find(".user"));
            }else{
                this.getGroup(true,this.domObj.find(".department"));//查询部门及员工列表信息
            }          
        }
    }

    /**
     * @function 初始化报表页面模板
     */
    initTableHtml(){
        if(this.iszgs){
            this.domObj.find(".table-caption").empty().append('<p><span class="user_name" style="float: left;">公司/员工：</span><span class="time_qj" style="float: right;">月份：</span></p>'); 
        }else{
            this.domObj.find(".table-caption").empty().append('<p><span class="user_name" style="float: left;">员工：</span><span class="time_qj" style="float: right;">月份：</span></p>');            
        }
    }

     /**
     * @function 初始化报表页面模板
     */
    initTableHtml2(){
        if(this.iszgs){
            this.domObj.find(".table-caption").empty().append('<p><span class="dept_name" style="float: left;">公司/部门：</span><span class="time_qj" style="float: right;">月份：</span></p>'); 
        }else{
            this.domObj.find(".table-caption").empty().append('<p><span class="dept_name" style="float: left;">部门：</span><span class="time_qj" style="float: right;">月份：</span></p>');            
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
                var strdepartment = "";//"<option value=''>全部</option>";
                $.each(results.result, function (index, item) {                    
                    if(AppX.appConfig.departmentid==item.companyid){
                        strdepartment += "<option selected value='" + item.companyid + "'>" + item.company_name + "</option>";
                    }else{
                        strdepartment += "<option value='" + item.companyid + "'>" + item.company_name + "</option>";
                    }   
                }.bind(this));
                this.domObj.find(".company").empty().append(strdepartment);
                this.companyid=(this.iszgs==true?this.domObj.find(".company option:selected").val():"");                
                this.getGroup(true,this.domObj.find(".department"));//查询部门及员工列表信息            
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    /**
     * @function 初始化时间控件
     */
    initTimeControl(){
        $.jeDate(".date",{
            format: 'YYYY-MM', //日期格式  
            isinitVal: true
        });
    }

    /**
     * @function 设置查询条件
     */
    setSearchContent(){
        this.search_obj={
            depid:(this.ispartment==false?this.domObj.find(".department option:selected").val():AppX.appConfig.groupid),
            userid:this.domObj.find(".user option:selected").val(),
            date:this.domObj.find(".date").val()
        }  
    }

    /**
     * @function 初始化事件
     */
    initEvent() {
        this.initTimeControl();
        this.initLoginUser();
        //查询
        this.domObj.find('.btn_search').on("click", function () {
            this.setSearchContent();
            if(this.search_obj.userid==""){//部门考勤记录表
                this.getDeptLoginStatistics();
            }else{//部门人员考勤记录表
                this.getUserLoginStatisitics();
            }           
                
        }.bind(this));

        //部门更新
        this.domObj.find('.department').on("change", function () {
            this.search_obj.depid=this.domObj.find(".department option:selected").val();
            this.getUser(true,this.domObj.find(".user"));
        }.bind(this));

        //打印
        this.domObj.find('.btn_print').on("click", function () {           
            (<any>$(".xjloginstatisiticslist")).print({                    
                    globalStyles: false,
                    mediaPrint: true,
                    stylesheet: "widgets/XJloginStatisitics/css/style.css",
                    iframe: true,
                    noPrintSelector: ".no-print",
                    prepend: "",
                    append: ""
                });
        }.bind(this));

        //导出报表
        this.domObj.find('.btn_export').on("click", function () { 
            mothedexport_xjloginstatisitics();
        }.bind(this));
    }

    /**
     * @function 获取部门人员考勤记录表
     */
    getUserLoginStatisitics(){
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj);
        this.domObj.find(".xjloginstatisiticslist").empty().append(this.template.split("$$")[1]);
        this.initTableHtml();
         $.ajax({
                headers: this.getHeaders(0),
                type: "POST",
                dataType: "json",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserLoginStatistics,
                data: {
                    "companyid":this.companyid,
                    "depid":this.search_obj.depid,
                    "search_date": this.search_obj.date,
                    "user_id": this.search_obj.userid
                },
                success: this.getUserLoginStatisiticsCallBack.bind(this),
                error: function () {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this)                
            });
    }
    getUserLoginStatisiticsCallBack(results){
        console.log(results);
        this.loadWait.Hide();
        if (results.code !== 1) {
            this.toast.Show(results.message);
            return;
        }
        this.html = "";
        if(results.result.ret!=null &&results.result.ret.length>0){
            var rows=results.result.ret[0].ret;
            for (var i = 0, length = rows.length; i < length; i++) {
                var date = rows[i].date;//日期
                var workTime = rows[i].work_time;//工作时长
                var distance = (rows[i].total_distance / 1000).toFixed(2);//总里程
                var time = (rows[i].total_time / 3600).toFixed(2);//总时长
                var validDistance = (rows[i].valid_distance / 1000).toFixed(2);//有效里程
                var validTime = (rows[i].valid_time / 3600).toFixed(2);//有效时间
                var valigve=(rows[i].valid_avg / 3600).toFixed(2);//有效平均时速
                var plan =(rows[i].pointpatroled==0&&rows[i].pointinplan==0?"无": rows[i].pointpatroled+"/"+rows[i].pointinplan);//巡检计划完成情况
                var planline =(rows[i].pathpatroled==0&&rows[i].pathinplan==0?"无": rows[i].pathpatroled+"/"+rows[i].pathinplan);//巡检线完成情况
                var hideDanger = (rows[i].trouble_info=="无隐患"?"无":rows[i].trouble_info);//上报隐患情况
                //var data = [i+1, date, workTime, distance, time, validDistance, validTime, plan, hideDanger];
                var index2 = 0;
                var backgroundColor = "#eeeeee";
                if (i % 2 == 0) {
                    backgroundColor = "white"
                }
                this.html += "<tr style='background-color:" + backgroundColor + "'><td>"
                                +(i+1)+"</td><td>"
                                +date+"</td><td>"
                                +workTime+"</td><td>"
                                +distance+"</td><td>"
                                +time+"</td><td>"
                                +validDistance+"</td><td>"
                                +validTime+"</td><td>"
                                +valigve+"</td><td>"
                                +plan+"</td><td>"
                                +planline+"</td><td>"
                                +hideDanger+"</td><td>"
                                +rows[i].equipmentspatroled+"/"+rows[i].equipmentsinplan+"</td><td>"                                
                                +rows[i].buildingsitefinded+"</td><td>"
                                +rows[i].buildingsitecomplete
                                +"</td></tr>";
            }
        }
        
        this.domObj.find(".terminalstatistics-list").empty().append(this.html); 

        if(this.iszgs==true){
             this.domObj.find(".user_name").text("公司/员工："+this.domObj.find(".company option:selected").text()+"/"+this.domObj.find(".user option:selected").text());
        }else{
            this.domObj.find(".user_name").text("员工："+this.domObj.find(".user option:selected").text());
        }
        
        this.domObj.find(".time_qj").text("查询月份："+this.domObj.find(".date").val());
        var myDate = new Date();
        var mytime=Functions.DateFormat(myDate,"yyyy年MM月dd日 hh:mm:ss");            
        this.domObj.find(".shenhe").text("审核人：");
        this.domObj.find(".zhibiao").text("制表人："+AppX.appConfig.realname);
        this.domObj.find(".shijian").text("制表时间：" + mytime);
        //$('#testTable').fixedHeaderTable({ footer: false, altClass: 'odd' });
    }

    /**
     * @function 获取部门考勤记录表
     */
    getDeptLoginStatistics(){
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj);   
        this.html=''; 
        this.addTitle();
        this.domObj.find(".xjloginstatisiticslist").empty().append(this.template.split("$$")[2]);
        this.domObj.find(".terminalstatistics-title").empty().append(this.html); 
        this.domObj.find(".terminalstatistics-list").empty(); 
        this.initTableHtml2(); 
        $.ajax({
                headers:this.getHeaders(0),
                type: "POST",
                dataType: "json",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getDeptLoginStatistics,
                data: {
                    "search_date": this.search_obj.date,
                    "depid": this.search_obj.depid,
                    "companyid":this.companyid
                },
                success: this.getDeptLoginStatisticsCallBack.bind(this),
                error: function () {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this) 
            });
    }
    getDeptLoginStatisticsCallBack(results){       
        if (results.code !== 1) {
            this.loadWait.Hide();
            this.toast.Show(results.message);
            return;
        }
        
        //表内容添加        
        var rows = results.result;//部门集合
        var titles=['工作时间','总里程(km)','工作时长(h)','有效里程(km)','有效时长(h)','有效平均时速(km/h)','巡检点情况(个)','巡检线情况(km)','隐患情况','设备巡检情况','工地发现数','监护工地数'];
       
        this.html='';
        if(rows!=null){
            for(var i=0;i<rows.length;i++){
                var infos=rows[i];
                if(infos.ret!=null){
                    for(var j=0;j<infos.ret.length;j++){
                        this.html+="<tr><td rowspan='11'>"+infos.ret[j].username+"</td>";
                        var count=(this.days>infos.ret[j].ret.length?infos.ret[j].ret.length:this.days);
                        var htmlstrs=['','','','','','','','','','','',''];
                        for(var k=0;k<this.days;k++){
                            var userinfos=infos.ret[j].ret[k];
                            htmlstrs[0]+='<td>'+userinfos.work_time+'</td>';
                            htmlstrs[1]+='<td>'+(userinfos.total_distance / 1000).toFixed(2)+'</td>';
                            htmlstrs[2]+='<td>'+(userinfos.total_time / 3600).toFixed(2)+'</td>';
                            htmlstrs[3]+='<td>'+(userinfos.valid_distance / 1000).toFixed(2)+'</td>';
                            htmlstrs[4]+='<td>'+(userinfos.valid_time / 3600).toFixed(2)+'</td>';
                            htmlstrs[5]+='<td>'+""+'</td>';//有效平均时速(km/h)
                            htmlstrs[6]+='<td>'+userinfos.plan_info+'</td>';
                            htmlstrs[7]+='<td>'+""+'</td>';//巡检线情况(km)
                            htmlstrs[8]+='<td>'+(userinfos.trouble_info=="无隐患"?"无":userinfos.trouble_info)+'</td>';
                            htmlstrs[9]+='<td>'+(userinfos.equipmentspatroled==0 &&userinfos.equipmentsinplan==0?"无":userinfos.equipmentspatroled+"/"+userinfos.equipmentsinplan)+'</td>';                            
                            htmlstrs[10]+='<td>'+userinfos.buildingsitefinded+'</td>';
                            htmlstrs[11]+='<td>'+userinfos.buildingsitecomplete+'</td>';               
                        }
                        for(var m=0;m<htmlstrs.length;m++){
                            if(m==0){
                                this.html+="<td>"+titles[m]+"</td>"+htmlstrs[m]+"</tr>";
                            }else{
                                this.html+="<tr><td>"+titles[m]+"</td>"+htmlstrs[m]+"</tr>";
                            }
                        }
                    }
                }
            }
            this.domObj.find(".terminalstatistics-list").empty().append(this.html);  
        }

        if(this.iszgs==true){
             this.domObj.find(".dept_name").text("公司/部门："+this.domObj.find(".company option:selected").text()+"/"+this.domObj.find(".department option:selected").text());
        }else{
            if(this.ispartment==false)
                this.domObj.find(".dept_name").text("部门："+this.domObj.find(".department option:selected").text());
            else
                this.domObj.find(".dept_name").hide();
        }
        
        this.domObj.find(".time_qj").text("查询月份："+this.domObj.find(".date").val());
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
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroup,
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
                this.getUser(true,this.domObj.find(".user"));
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json"
        });
    }

    /**
     * @function 获取人员列表
     * @param isall
     * @param obj
     */
    getUser(isall,obj){        
        $.ajax({
                headers: this.getHeaders(0),
                type: "POST",                
                dataType: "json",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUser,
                data: {
                    "pageindex": 1,
                    "pagesize": this.config.maxsize,
                    "depid": this.search_obj.depid,
                    "companyid":this.companyid
                },
                success: function (result) {
                    if (result.code != 1) {
                        this.toast.Show(result.message);
                        return;
                    }
                    var stroption = "";//"<option value=''>全部</option>";
                    if(isall==false){
                        stroption="";
                    }
                    result.result.rows.forEach(function (row) {                       
                        stroption += "<option value='" + row.userid + "'>" + row.username + "</option>";                                           
                    }.bind(this));
                    obj.empty().append(stroption);
                    if(this.isinit){//初始化查询
                        this.isinit=false;
                        this.setSearchContent();
                        if(this.search_obj.userid==""){//部门考勤记录表
                            this.getDeptLoginStatistics();
                        }else{//部门人员考勤记录表
                            this.getUserLoginStatisitics();
                        } 
                        //this.getUserLoginStatisitics();
                    }
                }.bind(this),
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
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