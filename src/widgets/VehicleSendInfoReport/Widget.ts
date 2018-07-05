import BaseWidget = require('core/BaseWidget.class');
import Functions =require('core/Functions.module');
declare var echarts;

export = VehicleSendInfoReport;

class VehicleSendInfoReport extends BaseWidget {
    baseClass = "widget-VehicleSendInfoReport";
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
        planrchedulebegindate:""
    }
    days=0;    
    weekday=["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];          
   /**
     * @function 启动
     */
    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
        this.initLoginUser();       
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
     * @function 初始化页面
     */
    initHtml() {
        var html = _.template(this.template)();
        this.setHtml(html);
        this.ready();
        this.initTimeControl();        
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
     * @function 根据登录账号（集团公司账号、子公司账号、部门账号）初始化
     */
    initLoginUser(){           
        this.initCompany();
        this.initTimeControl();
        this.search_obj.planrchedulebegindate=this.domObj.find(".planrchedulebegindate").val();
        this.initNoData();
        if(this.iszgs==true){//集团公司账号
            this.domObj.find(".company_serch").show();                   
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
                this.search_obj.depid="";
                this.getGroup(true,this.domObj.find(".department"));//查询部门及员工列表信息
            }
            this.getVehicleSendInfoReport();       
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
                this.getVehicleSendInfoReport();             
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
        $.jeDate(".planrchedulebegindate",{
            format: 'YYYY-MM', //日期格式  
            isinitVal: false
        });       
        var dt=new Date();
        this.domObj.find(".planrchedulebegindate").val(Functions.DateFormat(dt,"yyyy-MM"));
    }

    /**
     * @function 设置查询条件
     */
    setSearchContent(){
        this.search_obj={
            depid:(this.ispartment==false?this.domObj.find(".department option:selected").val():AppX.appConfig.groupid),
            carid:this.domObj.find(".plate_number option:selected").val(),
            planrchedulebegindate:this.domObj.find(".planrchedulebegindate").val()
        }  
    }
   
    /**
     * @function 初始化事件
     */
    initEvent() {
        //查询
        this.domObj.find('.btn_search').on("click", function () {
            this.setSearchContent();        
            this.getVehicleSendInfoReport();
        }.bind(this));

        //打印
        this.domObj.find('.btn_print').on("click", function () {           
            (<any>$(".sendinforeportreport-list")).print({                    
                    globalStyles: false,
                    mediaPrint: false,
                    stylesheet: "widgets/VehicleSendInfoReport/css/style.css",
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

         //部门列表
        this.domObj.find('.department').on("change", function () {  
            this.search_obj.depid=this.domObj.find(".department option:selected").val();             
            this.getCarList(true,this.domObj.find(".plate_number"));             
        }.bind(this));  
    }


    /**
     * @function 无数据查询结果
     */
    initNoData(){
        this.html="";
        this.addTitle();
        this.domObj.find(".sendinforeportreportlist").empty().append(this.html);
    }
   
    /**
     * 根据时间产生标题
     */
    addTitle(){
        var sdt=new Date(this.search_obj.planrchedulebegindate.replace(/-/g,"/")+"/01");
        var year=sdt.getFullYear();
        var mouth=sdt.getMonth()+1;
        this.days=0;
        if(mouth==2){
            this.days=year % 4==0?29:28;
        }else if(mouth==1 ||mouth ==3 ||mouth==5|| mouth==7|| mouth==8||mouth==10||mouth==12){
            this.days=31;
        }else{
            this.days=30;
        }      
        if(this.days>0){
            var trHtml='<tr class="sendtitle"><td>序号</td><td>部门名称</td><td>车牌号</td><td>车辆类型</td>';
            sdt.setDate(1);
            for(var i=1;i<=this.days;i++){
                var dwStr=this.weekday[sdt.getDay()];
                var cStr=i+"</br>("+dwStr+")";
                trHtml+="<td>"+cStr+"</td>";
                sdt=new Date( sdt.getTime() + 24*1*60*60*1000);
            }
            trHtml+='</tr>';
            this.html+=trHtml;
            }
    }

    /**
     * @function 组织查询结果内容
     */
    addContents(result){ 
        console.log(result);
        if(result!=null){
          var num=result.length;        
          if(num>0){
            for(var i=0;i<num;i++){                
                this.html+="<tr><td>"+(i+1)+"</td><td>"
                        +result[i].dept+"</td><td>"
                        +result[i].car+"</td><td>"
                        +result[i].cartype+"</td>";
                var tempInfos=[];
                //车辆数组
                if(result[i].plans!=null &&result[i].plans.length>0){
                    var cday=1,n=0;
                    for(var j=0;j<result[i].plans.length;j++){//组合同一天的
                        var st=new Date( result[i].plans[j].start_date.replace(/-/g,"/"));
                        var et=new Date( result[i].plans[j].end_date.replace(/-/g,"/"));
                        var collen=(et.getDate()-st.getDate()+1); 
                        if(tempInfos.length==0){
                            tempInfos.push({
                                maxLen:collen,
                                plans:[
                                    result[i].plans[j]
                                ]
                            });
                        }else{
                            var isSameDay=false;
                            for(var m=0;m<tempInfos[n].plans.length;m++){
                                var tst=new Date( tempInfos[n].plans[m].start_date.replace(/-/g,"/"));
                                var tet=new Date( tempInfos[n].plans[m].end_date.replace(/-/g,"/"));
                                if(st.getTime()>tst.getTime() && st.getTime()<tet.getTime()){
                                    isSameDay=true;
                                    break;
                                }
                            }
                            if(isSameDay){
                                 if(collen>tempInfos[n].maxLen){
                                     tempInfos[n].maxLen=collen;
                                 }
                                 tempInfos[n].plans.push(result[i].plans[j]);
                            }else{
                                n=n+1;
                                tempInfos.push({
                                    maxLen:collen,
                                    plans:[
                                        result[i].plans[j]
                                    ]
                                });
                            }
                        }
                    }
                    for(var j=0;j<tempInfos.length;j++){                        
                        var st=new Date( tempInfos[j].plans[0].start_date.replace(/-/g,"/"));
                        var et=new Date( tempInfos[j].plans[0].end_date.replace(/-/g,"/"));
                        for(var m=cday;m<st.getDate();m++){
                            this.html+="<td></td>";
                        }
                        var content="";
                        for(var ij=0;ij<tempInfos[j].plans.length;ij++){
                            content+="("+(ij+1)+")派车类型："+tempInfos[j].plans[ij].sendtype
                            +";派车时间："+tempInfos[j].plans[ij].start_date+"~"+tempInfos[j].plans[ij].end_date
                            +";用车人："+tempInfos[j].plans[ij].vehicle_man_user
                            +";出车地点："+tempInfos[j].plans[ij].dispatch_address
                            +";用途描述："+tempInfos[j].plans[ij].car_purpose;
                       }
                        this.html+="<td style='text-align:left;' colspan='"+tempInfos[j].maxLen+"'>"+content+"</td>";
                        if(et.getDate()+1>cday)
                            cday=et.getDate()+1;
                    }
                  for(var k=cday;k<=this.days;k++){
                     this.html+="<td></td>";
                  }
                }else{
                    for(var k=0;k<this.days;k++){
                        this.html+="<td></td>";
                    }
                }
                this.html+="</tr>";
            }
          }
        }
    }

    /**
     * @function 派车计划查询
     */
    getVehicleSendInfoReport() {
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj);
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleSendInfoReport,
            data: {
                "plan_month": this.search_obj.planrchedulebegindate,
                "deptid": this.search_obj.depid,
                "carid":this.search_obj.carid,
                "companyid":this.companyid
            },
            success: this.getVehicleSendInfoReportCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getVehicleSendInfoReportCallback(results) {
        this.loadWait.Hide();
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.html=""; 
        this.addTitle();//加标题
        if(results.result!=null)
            this.addContents(results.result.rows);
        this.domObj.find(".sendReportCaption").text("计划月份："+this.search_obj.planrchedulebegindate);  
        this.domObj.find(".sendinforeportreportlist").empty().append(this.html);         
        var myDate = new Date();
        var mytime=Functions.DateFormat(myDate,"yyyy年MM月dd日 hh:mm:ss");            
        this.domObj.find(".shenhe").text("审核人：");
        this.domObj.find(".zhibiao").text("制表人："+AppX.appConfig.realname);
        this.domObj.find(".shijian").text("制表时间：" + mytime);        
    }

     /**--------------------------查询字典---------------------*/
    /**
     * @function 部门列表
     * @param isall 是否显示全部
     * @param obj 对象
     */
    getGroup(isall,obj) {
        $.ajax({
            headers:this.getHeaders(0),
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
                this.getCarList(true,this.domObj.find(".plate_number")); 
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
     * @function 销毁对象
     */
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }
}