import BaseWidget = require('core/BaseWidget.class');
import Functions =require('core/Functions.module');
export = PlanScheduleReport;
class PlanScheduleReport extends BaseWidget {
    baseClass = "widget-planschedulereport";
    toast = null;
    popup = null;
    loadWait=null;

    companyid = "";//公司id
    iszgs=false;//是否是总公司账号  
    ispartment=false;//是否为部门账号

    planschedulereport_bdate = "";   
    html = ``;
    depid = "";//部门id
    userid = "";//用户id
    realName="";//制表人
    start = {
            format: 'YYYY/MM',           
            isinitVal:true,            
            maxDate: $.nowDate(0)
        };
    days=0;
    
    weekday=["日","一","二","三","四","五","六"];//["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];          
   
    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();        
    }

    initHtml() {
        var html = _.template(this.template)();
        this.setHtml(html);
        this.ready();
        //查询部门分组信息
        this.getGroup()
        //初始化人员
        this.getUser();
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
        this.initNoData();
        this.initCompany();    
        this.initTableHtml();    
        if(this.iszgs==true){//集团公司账号
            this.domObj.find(".company_serch").show();
            this.getCompanyList();
            //部门列表
            this.domObj.find('.company').on("change", function () {  
                this.companyid=this.domObj.find(".company option:selected").val();             
                this.getGroup();               
            }.bind(this));  
        }else{            
            this.domObj.find(".company_serch").hide();
            if(this.ispartment){
                this.depid=AppX.appConfig.groupid;//获取部门id
                this.domObj.find(".department_btn").hide();
                this.getUser();
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
            this.domObj.find(".table-caption").empty().append('<div class="cxgs" style="float:left;">公司：</div></br><div class="scheduleReportCaption" style="float:left;">计划月份：</div>'); 
        }else{
            this.domObj.find(".table-caption").empty().append('<div class="scheduleReportCaption" style="float:left;">计划月份：</div>');            
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
                this.getGroup();//查询部门及员工列表信息            
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

   
    initEvent() {
        $.jeDate(".planrchedulebegindate",this.start);
        this.initLoginUser();
       //查询
        this.domObj.find('.btn_search').on("click", function () { 
            if(this.ispartment==false)                    
                this.depid = this.domObj.find(".department").val();
            this.userid = this.domObj.find(".users").val();           
            this.getPlanScheduleReport();
        }.bind(this));
        //打印
        this.domObj.find('.btn_print').on("click", function () {
           //print();
            (<any>$(".hiddendangertrendinfo-list")).print({
                    //Use Global styles
                    globalStyles: false,
                    //Add link with attrbute media=print
                    mediaPrint: false,
                    //Custom stylesheet
                    stylesheet: "widgets/PlanScheduleReport/css/style.css",
                    //Print in a hidden iframe
                    iframe: true,
                    //Don't print this
                    noPrintSelector: ".no-print",//.no-print   .avoid-this
                    //Add this at top
                    prepend: "",
                    //Add this on bottom
                    append: ""
                });
        }.bind(this));

        this.domObj.find('.btn_export').on("click", function () { 
           mothedexport_schedulereport();
        }.bind(this));

        this.domObj.find('.department').on("change", function () {
            //根据部门重新筛选用户
            if(this.ispartment==false)
                this.depid = this.domObj.find('.department option:selected').val();
            this.getUser();
        }.bind(this));
    }

    initNoData(){
        this.html="";
        this.addTitle();
        this.domObj.find(".planschedulereport").empty().append(this.html);
    }
   
    /**
     * 根据时间产生标题
     */
    addTitle(){
        this.planschedulereport_bdate = this.domObj.find('.planrchedulebegindate').val();
        
        var sdt=new Date(this.planschedulereport_bdate+"/01");
        var year=sdt.getFullYear();
        var mouth=sdt.getMonth()+1;
        this.days=0;
        if(mouth==2){
            this.days=year % 4==0?29:28;
            if(this.days=28){
                this.domObj.find(".shenhe").attr("colspan","28");
            }else{
                this.domObj.find(".shenhe").attr("colspan","29");
            }
        }else if(mouth==1 ||mouth ==3 ||mouth==5|| mouth==7|| mouth==8||mouth==10||mouth==12){
            this.days=31;
            this.domObj.find(".shenhe").attr("colspan","31");
        }else{
            this.days=30;
        }     
        if(this.days>0){
            var trHtml='<tr class="plantitle"><td>序号</td><td>人员名称</td><td>部门名称</td>';
            sdt.setDate(1);
            for(var i=1;i<=this.days;i++){                
                var dateStr=Functions.DateFormat(sdt,"MM月dd日");
                var dwStr=this.weekday[sdt.getDay()];
                var cStr=i+"</br>("+dwStr+")";//dateStr+"\n"+dwStr; 
                trHtml+="<td>"+cStr+"</td>";
                sdt=new Date( sdt.getTime() + 24*1*60*60*1000);
            }
            trHtml+='</tr>';
            this.html+=trHtml;
            }
    }

    /**
     * 拼接内容
     */
    addContents(result){ 
        console.log(result);
        if(result!=null){
          var num=result.length;        
          if(num>0){
             var count=this.days;        
              for(var idx=0;idx<num;idx++){
                  var depName=result[idx].depname;
                  var userName=result[idx].username;  
                  var details=result[idx].detail;
                  var max=0;   
                  //求最大任务数，确定行数
                  if(details!=null){
                  for(var mdx=0;mdx<details.length;mdx++){
                      var infos=details[mdx].statistic;
                      if(infos!=null &&infos.length>0){
                            if(max<infos.length){
                                max=infos.length;
                            }
                      }
                  }   
                }
                
                var strHtml="<tr><td  class='tdmid' rowspan="+max+">"+(idx+1)+"</td><td class='tdmid' rowspan="+max+">"+userName+"</td><td class='tdmid'  rowspan="+max+">"+depName+"</td>";                
                if(details!=null){//一个人任务
                if(max==0){//所有的都没有任务                    
                   for(var i=0;i<count;i++){
                        strHtml+="<td></td>";
                   } 
                   strHtml+="</tr>"
                }else{
                    if(details.length<count){
                        var nd=details.length;
                        for(var j=0;j<count-nd;j++){
                            result[idx].detail.push({info:[]});
                        }                        
                    }
                }
                for(var dj=0;dj<max;dj++){
                    var hstr=""; 
                    if(dj>0){//第二行
                        hstr+="<tr>";
                    }    

                    for(var mdx=0;mdx<details.length;mdx++){//几天排班
                        var infos=details[mdx].statistic;
                        if(infos!=null &&infos.length>dj){//每天排班任务集合
                            var vobj=infos[dj];//第dj个任务
                            //var str = "("+(dj+1)+")"+vobj.device_type_name+"("+vobj.regionname+":"+vobj.period_name+")";
                            hstr+="<td class='lefttd'>"+"("+(dj+1)+")"+vobj+"</td>";
                        }else{
                            hstr+="<td></td>";
                        }
                    }
                   
                    hstr+="</tr>";
                    strHtml+=hstr;
                }
                     
                    }      
               
                   this.html+=strHtml;//增加多个人
              }
          }
        }
    }

    //排班计划表
    getPlanScheduleReport() {
        this.planschedulereport_bdate = this.domObj.find('.planrchedulebegindate').val(); 
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj);
        this.realName=AppX.appConfig.realname;
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanSchedule,
            data: {
                "depid": this.depid,
                "user_id": this.userid,
                "search_date": this.planschedulereport_bdate
            },
            success: this.getPlanScheduleReportCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getPlanScheduleReportCallback(results) {
        console.log(results);
        this.loadWait.Hide();
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        this.html=""; 
        this.addTitle();//加标题
        this.addContents(results.result);
        if(this.iszgs){
            this.domObj.find(".cxgs").text("公司：" + this.domObj.find(".company option:selected").text());
        }
        this.domObj.find(".scheduleReportCaption").text("计划月份："+this.planschedulereport_bdate);  
        this.domObj.find(".planschedulereport").empty().append(this.html);         
        var myDate = new Date();
        var mytime=Functions.DateFormat(myDate,"yyyy年MM月dd日 hh:mm:ss");            
        this.domObj.find(".shenhe").text("审核人：");
        this.domObj.find(".zhibiao").text("制表人："+this.realName);
        this.domObj.find(".shijian").text("制表时间：" + mytime);        
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
        var strdepartment = "<option value='' >所有部门</option>";
        $.each(results.result.rows, function (index, item) {
            strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";
        }.bind(this));
        this.domObj.find(".department").empty().append(strdepartment);
        this.depid=this.domObj.find(".department option:selected").val();
        this.getUser();
    }

    getUser() {
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "depid": this.depid,
                "companyid":this.companyid
            },
            success: this.getUserListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getUserListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        var strusers = "<option value=''>所有人员</option>";
        $.each(results.result.rows, function (index, item) {
            strusers += "<option value='" + item.userid + "'>" + item.username + "</option>";
        }.bind(this));
        this.domObj.find(".users").empty().append(strusers);
    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }
}