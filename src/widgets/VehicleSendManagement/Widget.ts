import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');
export = VehicleSendManagement;

class VehicleSendManagement extends BaseWidget {
    baseClass = "widget-VehicleSendManagement";
    toast = null;
    popup = null;
    loadWait=null;
    companyid = "";//公司id
    iszgs=false;//是否是总公司账号  
    ispartment=false;//是否为部门账号
    currentPopup=null;
    editlabel="add";//默认状态是添加add，编辑edit
    keyword = "";
    select_info={
        datas:[],
        ids:[],
        id:"",
        currentTarget:null
    };
    search_obj={
        depid:"",
        carid:"",
        start_date:"",
        end_date:""
    }
    plan_detail=[];

    /**
     * @function 启动功能页面
     */
    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
        this.initLoginUser();
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
     * @function 页面初始化
     */
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();
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
     * @function 根据登录账号（集团公司账号、子公司账号、部门账号）初始化
     */
    initLoginUser(){           
        this.initCompany(); 
        this.initTimeControl();        
        if(this.iszgs==true){//集团公司账号 
            this.domObj.find(".company_serch").show();           
            this.getCompanyList();
            //部门列表
            this.domObj.find('.company').off("change").on("change", function () {  
                this.companyid=this.domObj.find(".company option:selected").val();      
                this.setUserControl(this.companyid);       
                this.getGroup(true,this.domObj.find(".department"));//部门列表 
                this.search_obj.depid="";
                this.getCarList(true,this.domObj.find(".plate_number"),"plate_number");//车辆列表 
                this.getCarPlanList();             
            }.bind(this));  
        }else{
            this.domObj.find(".company_serch").hide();
            if(this.ispartment){
                this.search_obj.depid=AppX.appConfig.groupid;//获取部门id
                this.domObj.find(".department_btn").hide();
            }else{
                this.search_obj.depid="";
                this.getGroup(true,this.domObj.find(".department"));//查询部门及员工列表信息
            }            
            this.getCarList(true,this.domObj.find(".plate_number"),"plate_number");//车辆列表
            this.getCarPlanList();//初始化派车计划列表       
        }
    } 

    /**
     * @function 控件是否可用
     * @param companyid 公司id
     */
    setUserControl(companyid){
        if(AppX.appConfig.departmentid==companyid){//可进行编辑操作
            this.domObj.find('.btn_add').prop("disabled",false);
            this.domObj.find('.btn_edit').prop("disabled",false);
            this.domObj.find('.btn_delete').prop("disabled",false);
        }else{
            this.domObj.find('.btn_add').prop("disabled",true);
            this.domObj.find('.btn_edit').prop("disabled",true);
            this.domObj.find('.btn_delete').prop("disabled",true);
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
                this.search_obj.depid="";
                this.getCarList(true,this.domObj.find(".plate_number"),"plate_number");//车辆列表
                this.getCarPlanList();//初始化派车计划列表           
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    start = {
            format: 'YYYY-MM-DD',           
            isinitVal:false,
            choosefun: function(elem, val, date){
                var dt=new Date(val.replace(/-/g,"/"));
                this.end.minDate=Functions.DateFormat(dt,"yyyy-MM-dd");             
                this.domObj.find('.end_date').val(this.end.minDate);
            }.bind(this)
        };

    end = {
        format: 'YYYY-MM-DD', //日期格式  
        isinitVal: false,
        minDate:Functions.DateFormat(new Date(),"yyyy-MM-dd")
    };

     sendstart = {
            format: 'YYYY-MM-DD hh:mm',           
            isinitVal:true,
            choosefun: function(elem, val, date){                
                var dt=new Date(val.replace(/-/g,"/"));
                this.sendend.minDate=Functions.DateFormat(dt,"yyyy-MM-dd hh:mm");
                this.currentPopup.conObj.find('.send_end_date').val(this.sendend.minDate);
                
                this.sendend2.minDate=Functions.DateFormat(dt,"yyyy-MM-dd")+" 00:00:00";             
                this.currentPopup.conObj.find('.dispatch_time').val(this.sendend2.minDate);
            }.bind(this)
        };

    sendend = {
        format: 'YYYY-MM-DD hh:mm', //日期格式  
        isinitVal: true,
        minDate:Functions.DateFormat(new Date(),"yyyy-MM-dd hh:mm")
    };

    sendend2 = {
        format: 'YYYY-MM-DD hh:mm:ss', //日期格式  
        isinitVal: true,
        minDate:Functions.DateFormat(new Date(),"yyyy-MM-dd hh:mm:ss")
    };
    /**
     * @function 初始化时间控件
     */
    initTimeControl(){
         $.jeDate(".start_date",this.start);        
         $.jeDate(".end_date",this.end);
    }

    /**
     * @function 弹出初始化时间控件
     */
    initPopTimeControl(){
         $.jeDate(".send_start_date",this.sendstart);        
         $.jeDate(".send_end_date",this.sendend); 
         $.jeDate(".dispatch_time",this.sendend2);      
    }

    /**
     * @function 二次设置派车方式时间
     */
    initPopSendTimeControl(){
         $.jeDate(".start_date_time",{
            format: 'hh:mm',   
            isinitVal: false
        });        
         $.jeDate(".end_date_time",{
            format: 'hh:mm',  
            isinitVal: false
        });  
    }

    /**
     * @function 设置查询条件
     */
    setSearchContent(){
        this.search_obj={
            depid:(this.ispartment==false?this.domObj.find(".department option:selected").val():AppX.appConfig.groupid),
            carid:this.domObj.find(".plate_number option:selected").val(),
            start_date:this.domObj.find(".start_date").val(),
            end_date:this.domObj.find(".end_date").val()
        }  
    }

  

    /**
     * @function 事件初始化
     */
    initEvent() {
        var that=this;
        this.domObj.find('.department').off("change").on("change", function () {  
            this.search_obj.depid=this.domObj.find(".department option:selected").val();
            this.getCarList(true,this.domObj.find(".plate_number"),"plate_number");//车辆列表    
        }.bind(this));

        //查询 click
        this.domObj.find('.btn_search').on("click", function () {
            this.keyword = this.domObj.find('.search_condition').val();
            this.config.currentpage=1;
            this.setSearchContent();
            this.getCarPlanList();
        }.bind(this));

        //登记 click
        this.domObj.find('.btn_add').on("click", function () {
            this.editlabel="add";
           this.showInfo(null,"新增");                 
        }.bind(this));

        //更新 click
        this.domObj.find('.btn_edit').on("click", function () {
            var that=this;
            if (this.select_info.currentTarget == null) {
                this.toast.Show("请选择派车计划信息！");
                return;
            }
            this.editlabel="edit";
            this.showInfo(this.select_info.currentTarget,"修改");
        }.bind(this));          

        //删除 click
        this.domObj.find('.btn_delete').on("click", function () {
            if (this.select_info.ids.length==0) {
                this.toast.Show("请选择派车计划信息！");
                return;
            }

            this.popup.setSize(this.config.popuptip.width, this.config.popuptip.height);
            var Obj = this.popup.ShowMessage("提示", "是否删除选择数据？");
            Obj.submitObj.off("click").on("click", function () {
                this.popup.Close();
                $.ajax({
                    headers: {                    
                        'Token': AppX.appConfig.xjxj,
                        'departmentid': AppX.appConfig.departmentid,
                    },
                    type: "POST",
                    dataType: "json",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteCarPlan,
                    data: {
                        "list": this.select_info.ids
                    },
                    success: function(results){
                        if (results.code != 1) {
                            this.toast.Show(results.message);
                            return;
                        }                        
                        this.toast.Show(this.config.messages.delete);
                        this.config.currentpage=1;
                        this.getCarPlanList();
                    }.bind(this),
                    error: function (data) {
                        this.toast.Show(this.config.messages.delete);
                    }.bind(this)                    
                });
            }.bind(this));            
        }.bind(this));


        // 选中行高亮 click
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.select_info.currentTarget = $(e.currentTarget);                              
            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
            var edt=new Date(this.select_info.currentTarget.data('end_date').replace(/-/g,"/"));
            if((new Date()).getTime()-edt.getTime()<=0){//未过期
                if(this.select_info.currentTarget.data('send_type').indexOf('长期')>-1){
                    var state=this.select_info.currentTarget.data('state');
                    if(this.iszgs==true && AppX.appConfig.departmentid!=this.companyid){
                        this.domObj.find('.btn_stop').prop('disabled',true);
                        this.domObj.find('.btn_cancel').prop('disabled',true);
                    }else{                    
                        if(state==1){
                            this.domObj.find('.btn_stop').prop('disabled',false);
                            this.domObj.find('.btn_cancel').prop('disabled',true);
                        }else{
                            this.domObj.find('.btn_stop').prop('disabled',true);
                            this.domObj.find('.btn_cancel').prop('disabled',false);
                        }
                    }               
                }else{
                    this.domObj.find('.btn_stop').prop('disabled',true);
                    this.domObj.find('.btn_cancel').prop('disabled',true);
                }
            }else{
                    this.domObj.find('.btn_stop').prop('disabled',true);
                    this.domObj.find('.btn_cancel').prop('disabled',true);
                }
            
        });

        //上一页
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.config.currentpage - 1 > 0) {
                this.config.currentpage = this.config.currentpage - 1;
                this.getCarPlanList();
            }
        }.bind(this));

        //下一页
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.config.currentpage + 1 <= this.config.pagenumber) {
                this.config.currentpage = this.config.currentpage + 1;
                this.getCarPlanList();
            }
        }.bind(this));

        //返回
        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.config.pagenumber && currpage >= 1) {
                this.config.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getCarPlanList();
            }
        }.bind(this));

        //默认页条数修改
        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            this.config.pagesize= parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            this.keyword="";
            this.getCarPlanList();            
        }.bind(this));

        //全选
        this.domObj.find('.select_carplan_all_list').off("change").on("change", function () {
            if (this.domObj.find(".select_carplan_all_list").prop('checked') == true) {
                this.domObj.find(".select_carplan_list").each(function () {                    
                    $(this).prop('checked', true);
                    that.removeOrAddSelectItem(true,$(this));
                });
            } else {
                this.domObj.find(".select_carplan_list").each(function () {
                    $(this).prop('checked', false);
                    that.removeOrAddSelectItem(false,$(this));
                });
            }
        }.bind(that));   

         //停用车辆 click
        this.domObj.find('.btn_stop').on("click", function () {
            this.popup.setSize(this.config.popuptip.width, this.config.popuptip.height);
            var Obj = this.popup.ShowMessage("提示", "是否停用该车辆？");
            Obj.submitObj.off("click").on("click", function () {
                this.popup.Close();
                $.ajax({
                    headers: this.getHeaders(1),
                    type: "POST",
                    dataType: "json",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.stopVehicle,
                    data: {
                        "carid": this.select_info.currentTarget.data('carid'),
                        "carplanid":this.select_info.currentTarget.data('id')
                    },
                    success: function(results){
                        if (results.code != 1) {
                            this.toast.Show(results.message);
                            return;
                        }                        
                        this.toast.Show("停用车辆成功！");
                        this.config.currentpage=1;
                        this.getCarPlanList();
                    }.bind(this),
                    error: function (data) {
                        this.toast.Show(this.config.messages.other);
                    }.bind(this)                    
                });
            }.bind(this));                 
        }.bind(this)); 

         //停用车辆 click
        this.domObj.find('.btn_cancel').on("click", function () {
           this.popup.setSize(this.config.popuptip.width, this.config.popuptip.height);
            var Obj = this.popup.ShowMessage("提示", "是否取消停用该车辆？");
            Obj.submitObj.off("click").on("click", function () {
                this.popup.Close();
                $.ajax({
                    headers:this.getHeaders(1),
                    type: "POST",
                    dataType: "json",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.cancelVehicle,
                    data: {
                        "list": [this.select_info.currentTarget.data('id')]
                    },
                    success: function(results){
                        if (results.code != 1) {
                            this.toast.Show(results.message);
                            return;
                        }                        
                        this.toast.Show("取消停用车辆成功！");
                        this.config.currentpage=1;
                        this.getCarPlanList();
                    }.bind(this),
                    error: function (data) {
                        this.toast.Show(this.config.messages.other);
                    }.bind(this)                    
                });
            }.bind(this));                  
        }.bind(this));    
    }

    /**
     * @function 获取派车计划信息列表
     */
    getCarPlanList() {
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj);
        this.select_info={
            datas:[],
            ids:[],
            id:"",
            currentTarget:null
        };  
        this.domObj.find(".select_carplan_all_list").prop('checked',false);
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            dataType: "json",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getCarPlanList,
            data: {
                "pageindex": this.config.currentpage,
                "pagesize": this.config.pagesize,
                "department": this.search_obj.depid,
                "plandate_start":this.search_obj.start_date,
                "plandate_end":this.search_obj.end_date,
                "carid":this.search_obj.carid,
                "companyid":this.companyid
            },
            success: this.getCarPlanListListCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show(this.config.messages.other);
            }.bind(this)
        });
    }
    getCarPlanListListCallback(results) { 
        console.log(results); 
        this.loadWait.Hide();     
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        if (results.result.total % this.config.pagesize == 0) {
            this.config.pagenumber = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize));
        } else {
            this.config.pagenumber = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize)) + 1;
        }

        //为分页控件添加信息
        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条，每页");
        this.domObj.find(".content").text("第" + that.config.currentpage + "页共" + that.config.pagenumber + "页");
        this.domObj.find(".selectpagecontrol").text("，当前选中"+this.select_info.datas.length+"条");
        if (this.config.pagenumber == 0) {
            this.domObj.find(".pagecontrol").text("总共-条，每页-条");
            this.domObj.find(".content").text("第-页共-页");
            this.domObj.find(".selectpagecontrol").text("，当前选中-条");
        }
        var html_trs_data = "";
        $.each(results.result.rows, function (i, item) {
            html_trs_data += "<tr class=goto  data-id='" + item.id
             + "' data-carid='" + item.carid 
             + "' data-state='" + item.state 
             + "' data-driver_userid='" + item.driver_userid
             + "' data-send_type_id='" + item.send_type_id 
             + "' data-send_type='" + item.sendtype 
             + "' data-start_date='" + item.start_date
             + "' data-end_date='" + item.end_date
             + "' data-odograph_start_reading='" + item.odograph_start_reading
             + "' data-odograph_end_reading='" + item.odograph_end_reading
             + "' data-odograph_total_reading='" + item.odograph_total_reading
             + "' data-vehicle_man_userid='" + item.vehicle_man_userid
             + "' data-dispatch_time='" + item.dispatch_time
             + "' data-dispatch_address='" + item.dispatch_address
             + "' data-car_purpose='" + item.car_purpose
             + "' data-send_userid='" + item.send_userid
             + "' data-send_user='" + item.send_user
             + "' data-send_mode_id='" + item.send_mode_id
             + "' data-create_time='" + item.create_time 
             + "' data-plandetails='"+(item.plandetails!=null?JSON.stringify(item.plandetails):"")                                              
             + "'><td class='checkwidth'><input type='checkbox' class='select_carplan_list' data-id='" + item.id
             + "' data-carid='" + item.carid
             + "' data-state='" + item.state 
             + "' data-driver_userid='" + item.driver_userid
             + "' data-send_type_id='" + item.send_type_id 
             + "' data-send_type='" + item.sendtype
             + "' data-start_date='" + item.start_date
             + "' data-end_date='" + item.end_date
             + "' data-odograph_start_reading='" + item.odograph_start_reading
             + "' data-odograph_end_reading='" + item.odograph_end_reading
             + "' data-odograph_total_reading='" + item.odograph_total_reading
             + "' data-vehicle_man_userid='" + item.vehicle_man_userid
             + "' data-dispatch_time='" + item.dispatch_time
             + "' data-dispatch_address='" + item.dispatch_address
             + "' data-car_purpose='" + item.car_purpose
             + "' data-send_userid='" + item.send_userid
             + "' data-send_user='" + item.send_user
             + "' data-create_time='" + item.create_time
             + "' data-send_mode_id='" + item.send_mode_id 
             + "' data-plandetails='"+(item.plandetails!=null?JSON.stringify(item.plandetails):"")
             +"'/></td><td title='"+item.car+"'>" + item.car + "</td><td title='"+item.dept+"'>" 
             + item.dept + "</td><td title='"+this.config.isrun[item.state]+"'>" 
             + this.config.isrun[item.state] + "</td><td title='"+item.driver_user+"'>" 
             + item.driver_user + "</td><td title='"+item.sendtype+"'>"
             + item.sendtype + "</td><td title='"+item.start_date+"'>" 
             + item.start_date + "</td><td title='"+item.end_date+"'>" 
             + item.end_date + "</td><td title='"+item.vehicle_man_user+"'>"
             + item.vehicle_man_user + "</td><td title='"+item.dispatch_time+"'>"
             + item.dispatch_time + "</td><td title='"+item.send_user+"'>"
             + item.send_user
             + "</td><td><a class='operation' data-id='" + item.id
             + "' data-carid='" + item.carid 
             + "' data-driver_userid='" + item.driver_userid
             + "' data-send_type_id='" + item.send_type_id 
             + "' data-state='" + item.state 
             + "' data-send_type='" + item.sendtype
             + "' data-start_date='" + item.start_date
             + "' data-end_date='" + item.end_date
             + "' data-odograph_start_reading='" + item.odograph_start_reading
             + "' data-odograph_end_reading='" + item.odograph_end_reading
             + "' data-odograph_total_reading='" + item.odograph_total_reading
             + "' data-vehicle_man_userid='" + item.vehicle_man_userid
             + "' data-dispatch_time='" + item.dispatch_time
             + "' data-dispatch_address='" + item.dispatch_address
             + "' data-car_purpose='" + item.car_purpose
             + "' data-send_userid='" + item.send_userid
             + "' data-send_user='" + item.send_user
             + "' data-create_time='" + item.create_time
             + "' data-send_mode_id='" + item.send_mode_id 
             + "' data-plandetails='"+(item.plandetails!=null?JSON.stringify(item.plandetails):"")
             +"'>查看详细</a></td></tr>";           
        }.bind(this));
        this.domObj.find(".sendlist").empty().append(html_trs_data);   
        
        //查看详细
        this.domObj.find(".operation").off("click").on("click", function (e) { 
            this.select_info.currentTarget=$(e.currentTarget);
            this.editlabel="detail";                         
            this.showInfo($(e.currentTarget),"查看详细");
        }.bind(that)); 

        //勾选
        this.domObj.find('.select_carplan_list').off("change").on("change",function(e){  
            this.removeOrAddSelectItem(e.currentTarget.checked,$(e.currentTarget));
        }.bind(that));    
    }   

    /**
     * @function 显示当前数据，可编辑，添加
     * @param target 对象
     */
    showInfo(target,tit){
        this.popup.setSize(this.config.popupsize.width, this.config.popupsize.height);
        var Obj = (this.editlabel=="detail"?this.popup.Show(tit, this.template.split('$$')[5],true):this.popup.Show(tit, this.template.split('$$')[1]));  
        this.initPopTimeControl();            
        this.currentPopup=Obj;
        var upload,id="";
        if(target!=null){ 
            Obj.conObj.find(".carid").prop('disabled',true);
            id=target.data("id");
            Obj.conObj.find('.send_start_date').val(target.data("start_date"));
            Obj.conObj.find('.send_end_date').val(target.data("end_date"));
            Obj.conObj.find('.odograph_start_reading').val(target.data("odograph_start_reading"));
            Obj.conObj.find('.odograph_end_reading').val(target.data("odograph_end_reading"));
            Obj.conObj.find('.odograph_total_reading').val(target.data("odograph_total_reading"));   
            Obj.conObj.find('.dispatch_time').val(target.data("dispatch_time"));
            Obj.conObj.find('.dispatch_address').val(target.data("dispatch_address"));
            Obj.conObj.find('.car_purpose').val(target.data("car_purpose"));          
            Obj.conObj.find('.send_user').val(target.data("send_user"));
        }else{
            Obj.conObj.find(".carid").prop('disabled',false);    
            Obj.conObj.find('.send_user').val(AppX.appConfig.realname);     
        }
        this.getCarList(false,Obj.conObj.find(".carid"),"carid");
        this.getDriver(false,Obj.conObj.find(".driver_userid"),"driver_userid");
        this.getSysConfig(this.config.plantypekey,"send_type_id",Obj.conObj.find(".send_type_id"),false);
        this.getUser(Obj.conObj.find(".vehicle_man_userid"),false,"vehicle_man_userid");      
       
        //change event
        Obj.conObj.find(".send_type_id").off("change").on("change",function(e){
            this.addMode(); 
        }.bind(this));
       
      

        (<any>$('#widget-VehicleDriverBaseInfoManagement_addpopup')).bootstrapValidator();
        //提交保存
        Obj.submitObj.off("click").on("click", function () {
                var send_start_date = Obj.conObj.find('.send_start_date');  
                var send_end_date = Obj.conObj.find('.send_end_date');   
                var send_type_name=Obj.conObj.find('.send_type_id option:selected').text();                                     
                if (send_start_date.val() == '') {
                    send_start_date.addClass('has-error');                       
                    this.popup.ShowTip("开始日期不能为空！");
                    return;
                } 
                if (send_end_date.val() == '') {
                    send_end_date.addClass('has-error');                       
                    this.popup.ShowTip("结束日期不能为空！");
                    return;
                }

                var sdt=new Date(send_start_date.val().replace(/-/g,"/")),edt=new Date(send_end_date.val().replace(/-/g,"/"));
                if(edt.getTime()-sdt.getTime()<0){
                    this.popup.ShowTip("派车结束时间小于派车开始时间！");
                    return;
                }
                var plandetails=[];
                if(send_type_name.indexOf('长期')>-1){//长期派车
                    var send_mode_name=Obj.conObj.find(".send_mode_id option:selected").text();
                    if(send_mode_name.indexOf('每周')>-1){//选择的是每周那几天派车方式
                        if(this.plan_detail.length==0){
                            this.popup.ShowTip("派车方式未设置！");
                            return; 
                        }
                         for(var k=0;k<this.plan_detail.length;k++){
                            var item={
                                ID:"",
                                SPECIFIC_PERIOD:null,
                                WEEKLY_DAY:this.plan_detail[k].weekly_day,
                                START_DATE:this.plan_detail[k].start_date,
                                END_DATE:this.plan_detail[k].end_date,
                                CAR_PLAN_ID:id,
                                COMPANYID:this.companyid,
                                NOTES:""
                            }
                            plandetails.push(item);
                        }
                    }else{
                         var all_day=Obj.conObj.find(".mode_all").prop('checked');
                         var dayitem={
                                ID:"",
                                SPECIFIC_PERIOD:null,
                                WEEKLY_DAY:"",
                                START_DATE:all_day==true?"":Obj.conObj.find(".start_date_time").val(),
                                END_DATE:all_day==true?"":Obj.conObj.find(".end_date_time").val(),
                                CAR_PLAN_ID:id,
                                COMPANYID:this.companyid,
                                NOTES:""
                            }
                         if(all_day==false){
                             if(dayitem.START_DATE=="" ||dayitem.END_DATE==""){
                                this.popup.ShowTip("派车方式的时间点不能为空！");
                                return; 
                             }                            
                        }
                       
                         plandetails.push(dayitem);
                    }
                }
               
                var str=JSON.stringify(plandetails);
                console.log(str);
                $.ajax({
                    headers: this.getHeaders(1),
                    type: "POST",
                    dataType: "json",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + (this.editlabel=="add"?this.config.addCarPlan:this.config.updateCarPlan),
                    data: {
                        "plandetails":str,
                        "id":id,
                        "carid":Obj.conObj.find('.carid option:selected').val(),
                        "driver_userid":Obj.conObj.find('.driver_userid option:selected').val(),
                        "send_type_id":Obj.conObj.find('.send_type_id option:selected').val(),
                        "start_date":Obj.conObj.find('.send_start_date').val(),
                        "end_date":Obj.conObj.find('.send_end_date').val(),
                        "odograph_start_reading":Obj.conObj.find('.odograph_start_reading').val(),
                        "odograph_total_reading":Obj.conObj.find('.odograph_total_reading').val(),
                        "odograph_end_reading":Obj.conObj.find('.odograph_end_reading').val(),
                        "vehicle_man_userid":Obj.conObj.find('.vehicle_man_userid option:selected').val(),
                        "dispatch_time":Obj.conObj.find('.dispatch_time').val(),
                        "dispatch_address":Obj.conObj.find('.dispatch_address').val(),
                        "car_purpose":Obj.conObj.find('.car_purpose').val(),
                        "send_user":Obj.conObj.find('.send_user').val(),
                        "send_mode_id":Obj.conObj.find(".send_mode_id option:selected").val()
                    },
                    success: function(results){                        
                        console.log(results.message);
                        if(results.code!=1){
                            this.popup.ShowTip(results.message);
                            return;
                        }
                        this.popup.Close();
                        this.toast.Show(this.editlabel=="add"?this.config.messages.add:this.config.messages.update);
                        this.getCarPlanList(); 
                    }.bind(this),
                    error: function (data) {
                         this.popup.ShowTip(this.config.messages.other);
                    }.bind(this)
                });                            
        }.bind(this));                             
    }

    /**----------------------------字典获取------------------------- */ 
    /**
     * @function 获取司机信息列表
     * @param isall
     * @param obj
     * @param key
     */
    getDriver(isall,obj,key) {        
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            dataType: "json",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getDriverList,
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
                var strusers = "<option value='' selected>全部</option>";
                if(isall==false){
                    strusers="";
                }
                $.each(results.result.rows, function (index, item) {
                     if(this.select_info.currentTarget!=null&&this.select_info.currentTarget.data(key)==item.id && this.editlabel=="edit"){//编辑状态
                        strusers += "<option selected='selected' value='" + item.id + "'>" + item.name + "</option>";
                    }else{
                        strusers += "<option value='" + item.id + "'>" + item.name + "</option>";
                    }
                }.bind(this));
                obj.empty().append(strusers);
            }.bind(this),
            error: function (data) {
                this.toast.Show(this.config.messages.other);
            }.bind(this)
        });
    }
      
    /**
     * @function 根据部门id获取用户列表，空代表查询全部
     * @param obj
     * @param isall 
     * @param key
     */
    getUser(obj,isall,key) {
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            dataType: "json",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserList,
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
                var strusers = "<option value='' selected>全部</option>";
                if(isall==false){
                    strusers="";
                }
                $.each(results.result.rows, function (index, item) {
                     if(this.select_info.currentTarget!=null&&this.select_info.currentTarget.data(key)==item.userid && this.editlabel=="edit"){//编辑状态
                        strusers += "<option selected='selected' value='" + item.userid + "'>" + item.username + "</option>";
                    }else{
                        strusers += "<option value='" + item.userid + "'>" + item.username + "</option>";
                    }
                }.bind(this));
                obj.empty().append(strusers);
            }.bind(this),
            error: function (data) {
                this.toast.Show(this.config.messages.other);
            }.bind(this)
        });
    }
    

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
                console.log(results);
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
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json"
        });
    }

    /**
     * @function 获取启用车辆列表
     * @param isall
     * @param obj
     * @param key
     */
    getCarList(isall,obj,key){
        $.ajax({
                headers: this.getHeaders(0),
                type: "POST",                
                dataType: "json",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleList,
                data: {
                    "pageindex": 1,
                    "pagesize": this.config.maxsize,
                    "depid":this.search_obj.depid,
                    "companyid":this.companyid,
                    "state":1
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
                        if(this.select_info.currentTarget!=null&&this.select_info.currentTarget.data(key)==row.id && this.editlabel=="edit"){//编辑状态
                            stroption += "<option selected='selected' value='" +row.id + "'>" + row.plate_number + "</option>"; 
                        }else{
                            stroption += "<option value='" + row.id + "'>" + row.plate_number + "</option>";
                        }                                         
                    }.bind(this));
                    obj.empty().append(stroption);
                }.bind(this),
                error: function (data) {
                    this.popup.ShowTip("服务端ajax出错，获取数据失败!");
                }.bind(this)
            });
    } 

    /**
     * @function 获取weeklyday字典（当选择长期派车方式时，派车方式设置为每周哪几日方式时，需要设置）
     * @param key 字典关键字
     * @param isall 是否为必选，false必选、true非必选
     * @param obj
     */
    getDicOther(key,isall,obj){
        var datas=this.config.dictables[key].datas;
        var values=this.config.dictables[key].value;
        var optstr="<option value=''>全部</option>";
        if(isall==false){
            optstr="";
        }
        for(var i=0;i<datas.length;i++){
            var name=datas[i];  
            var value=values[i];
            if(this.select_info.currentTarget!=null&&this.select_info.currentTarget.data(key)==value && this.editlabel=="edit"){//编辑状态
                optstr += "<option value='" + value + "' selected='selected'>" + name + "</option>";
            }else{
                optstr += "<option value='" + value + "'>" + name + "</option>";
            }
            obj.empty().append(optstr);
        }                
    }

    /**
     * @function 添加或删除选中集合
     * @param ischecked 
     * @param currentTarget
     */
    removeOrAddSelectItem(ischecked,currentTarget){
        var item={ 
                "id": currentTarget.data('id')              
            };
        if (ischecked){//添加
              var isExist=0;
              for(var i=0;i<this.select_info.datas.length;i++){
                var arrSid=this.select_info.datas[i];
                if(arrSid.id==item.id){
                    isExist=1;
                    break;
                }
            }
            if(isExist==0){
                this.select_info.datas.push(item);
                this.select_info.ids.push(item.id);
            }
                
         }else{//取消
            var arrSids=[],ids=[];
            for(var i=0;i<this.select_info.datas.length;i++){
                var arrSid=this.select_info.datas[i];
                if(arrSid.id!=item.id){
                    ids.push(arrSid.id);
                    arrSids.push(arrSid);
                }
            }
           this.select_info.datas=arrSids;
           this.select_info.ids=ids;
        }
        this.domObj.find(".selectpagecontrol").text("，当前选中"+this.select_info.datas.length+"条");
    } 

    /**
     * @function 获取系统字典参数
     * @param key
     * @param controlname
     * @param obj
     * @param isall
     */
    getSysConfig(key,controlname,obj,isall){
        $.ajax({
                headers:this.getHeaders(1),
                type: "POST",                
                dataType: "json",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getConfigList,
                data: {
                    "pageindex": 1,
                    "pagesize": this.config.maxsize,
                    "key":key
                },
                success: function (result) {
                    console.log(result);
                    if (result.code != 1) {
                        this.toast.Show(result.message);
                        return;
                    }
                    var stroption = (isall==true?"<option value=''>全部</option>":"");
                    result.result.rows.forEach(function (row) {
                        if(this.select_info.currentTarget!=null&&this.select_info.currentTarget.data(controlname)==row.id && (this.editlabel=="edit" ||this.editlabel=="detail")){//编辑状态
                            stroption += "<option selected='selected' value='" + row.id + "'>" + row.value + "</option>";
                        }else{
                            stroption += "<option value='" + row.id + "'>" + row.value + "</option>";
                        }                        
                    }.bind(this));
                    obj.empty().append(stroption);
                    if(controlname=="send_type_id"){//派车类型
                        this.addMode();
                    }

                    if(controlname=="send_mode_id"){//设置方式，每日、每工作日、每周哪几日                        
                        this.addDayTime();
                    }
                }.bind(this),
                error: function (data) {
                    this.popup.ShowTip(this.config.messages.other);
                }.bind(this)
            });
    } 

    /**
     * @function 设置派车方式
     */
    addMode(){
        var typeName=this.currentPopup.conObj.find(".send_type_id option:selected").text();
        console.log(typeName.indexOf('长期'));
        if(typeName.indexOf('长期')>-1){
            this.currentPopup.conObj.find(".send_type_methed").empty().append(this.template.split('$$')[2]);            
            this.getSysConfig(this.config.cartypekey,"send_mode_id", this.currentPopup.conObj.find(".send_mode_id"),false) ;
            this.currentPopup.conObj.find(".send_mode_id").off("change").on("change",function(e){
                this.currentPopup.conObj.find(".mode_all").prop('checked',true);
                this.addDayTime();
            }.bind(this));

             this.currentPopup.conObj.find(".mode_all").off("change").on("change",function(e){
               if(this.currentPopup.conObj.find(".mode_all").prop('checked')==true){
                   this.currentPopup.conObj.find(".start_date_time").prop('disabled',true);
                   this.currentPopup.conObj.find(".end_date_time").prop('disabled',true);
               }else{
                    this.currentPopup.conObj.find(".start_date_time").prop('disabled',false);
                    this.currentPopup.conObj.find(".end_date_time").prop('disabled',false);
               }
            }.bind(this));
        }else{
            this.currentPopup.conObj.find(".send_type_methed").empty();
        }
    }

    /**
     * @function 设置具体方式
     */
    addDayTime(){
        var typeName=this.currentPopup.conObj.find(".send_mode_id option:selected").text();
        if(typeName.indexOf('每周')>-1){//长期派车
           this.currentPopup.conObj.find(".time_set_group").empty().append(this.template.split('$$')[3]);
           this.getDicOther("weeklyday",false,this.currentPopup.conObj.find(".weeklyday"));
           //当处于编辑的时候需要赋值
           if(this.select_info.currentTarget!=null && this.editlabel=="edit"){
                var plandetails=this.select_info.currentTarget.data('plandetails');
                var dts=plandetails;//JSON.parse(plandetails);
               
                this.plan_detail=[];
                var htmlStr="";
                for(var i=0;i<dts.length;i++){
                    var obj=dts[i];  
                    var isallday=false;
                    obj.weekly_day_name=this.config.weekly_dic[obj.weekly_day];
                    if(obj.start_date==""){
                        isallday=true;
                    }
                    this.plan_detail.push(obj);                    
                    var wdn=isallday==true?"全天":obj.start_date+'~'+obj.end_date;                 
                        htmlStr+='<div class="form-inline">'+
                            ' <label class="control-label" style="float: left;margin-left: 10px;">'+obj.weekly_day_name+' '+wdn+' </label>'
                            +'<img class="img-remove"  data-weekly_day="'+obj.weekly_day+'" src="./vendor/extentjs/images/x_alt.png" title="删除"> </div>';                      
                }
                this.currentPopup.conObj.find(".cartypelists").empty().append(htmlStr);
                 
                 //移除
                this.currentPopup.conObj.find(".cartypelists").off("click").on("click",function(evt){                          
                    if(evt.target.className.match(/img-remove/)){
                        var weekly_day=$(evt.target).data("weekly_day");
                        var newplans=[];
                        for(var j=0;j<this.plan_detail.length;j++){
                            var iobj=this.plan_detail[j];
                            if(iobj.weekly_day!=weekly_day){
                                newplans.push(iobj);
                            }
                        }
                        this.plan_detail=newplans;
                        var htmlStr="";
                        for(var i=0;i<this.plan_detail.length;i++){
                            var obj=this.plan_detail[i];
                            
                                htmlStr+='<div class="form-inline">'+
                                    ' <label class="control-label" style="float: left;margin-left: 10px;">'+obj.weekly_day_name+' '+obj.start_date+'~'+obj.end_date+' </label>'
                                    +'<img class="img-remove"  data-weekly_day="'+obj.weekly_day+'" src="./vendor/extentjs/images/x_alt.png" title="删除"> </div>';                      
                        }
                        this.currentPopup.conObj.find(".cartypelists").empty().append(htmlStr);
                    }                          
                }.bind(this)); 
           }

           //设置
            this.currentPopup.conObj.find(".btn_add_time").off("click").on("click",function(){
                var start_time=this.currentPopup.conObj.find(".start_date_time");
                var end_time=this.currentPopup.conObj.find(".end_date_time");
                var weeklyday=this.currentPopup.conObj.find(".weeklyday option:selected");
                var all_day=this.currentPopup.conObj.find(".mode_all").prop('checked');
                if(all_day==false){
                    if(start_time.val()==""){
                        start_time.addClass('has-error');                       
                        this.popup.ShowTip("设置开始时间不能为空！");
                        return;
                    }
                    if(end_time.val()==""){
                        end_time.addClass('has-error');                       
                        this.popup.ShowTip("设置结束时间不能为空！");
                        return;
                    }

                    if((new Date("2011/01/01 "+start_time.val()+":00")).getTime()-(new Date("2011/01/01 "+end_time.val()+":00")).getTime()>0){
                        this.popup.ShowTip("开始时间必须小于结束时间！");
                        return;
                    }
                }
                
                var item={
                    weekly_day:weeklyday.val(),
                    weekly_day_name:weeklyday.text(),
                    start_date:all_day==true?"":start_time.val(),
                    end_date:all_day==true?"":end_time.val(),
                    car_plan_id:this.select_info.currentTarget!=null?this.select_info.currentTarget.data("id"):"",
                    all_day:all_day
                }
                var newplans=[];
                var isexit=false;
                for(var j=0;j<this.plan_detail.length;j++){
                    var iobj=this.plan_detail[j];
                    if(iobj.weekly_day==item.weekly_day){
                        newplans.push(item);  
                        isexit=true;                      
                    }else{
                        newplans.push(iobj);                        
                    }
                }
                if(isexit==false){
                    newplans.push(item);
                }
                this.plan_detail=newplans;

                var htmlStr="";
                for(var i=0;i<this.plan_detail.length;i++){
                    var obj=this.plan_detail[i];  
                    var wdn=obj.all_day==true?"全天":obj.start_date+'~'+obj.end_date;                 
                        htmlStr+='<div class="form-inline">'+
                            ' <label class="control-label" style="float: left;margin-left: 10px;">'+obj.weekly_day_name+' '+wdn+' </label>'
                            +'<img class="img-remove"  data-weekly_day="'+obj.weekly_day+'" src="./vendor/extentjs/images/x_alt.png" title="删除"> </div>';                      
                }
                this.currentPopup.conObj.find(".cartypelists").empty().append(htmlStr);

                //移除
                this.currentPopup.conObj.find(".cartypelists").off("click").on("click",function(evt){                          
                    if(evt.target.className.match(/img-remove/)){
                        var weekly_day=$(evt.target).data("weekly_day");
                        var newplans=[];
                        for(var j=0;j<this.plan_detail.length;j++){
                            var iobj=this.plan_detail[j];
                            if(iobj.weekly_day!=weekly_day){
                                newplans.push(iobj);
                            }
                        }
                        this.plan_detail=newplans;
                        var htmlStr="";
                        for(var i=0;i<this.plan_detail.length;i++){
                            var obj=this.plan_detail[i];
                            var wdn=obj.all_day==true?"全天":obj.start_date+'~'+obj.end_date;  
                                htmlStr+='<div class="form-inline">'+
                                    ' <label class="control-label" style="float: left;margin-left: 10px;">'+obj.weekly_day_name+' '+wdn+' </label>'
                                    +'<img class="img-remove"  data-weekly_day="'+obj.weekly_day+'" src="./vendor/extentjs/images/x_alt.png" title="删除"> </div>';                      
                        }
                        this.currentPopup.conObj.find(".cartypelists").empty().append(htmlStr);
                    }                          
                }.bind(this));             
               
            }.bind(this));
        }else{
            this.currentPopup.conObj.find(".time_set_group").empty().append(this.template.split('$$')[4]);
            //当处于编辑的时候需要赋值
            if(this.select_info.currentTarget!=null && this.editlabel=="edit"){
                var plandetails=this.select_info.currentTarget.data('plandetails');
                if(plandetails!=""){
                    var dts=plandetails;//JSON.parse(plandetails);
                    this.currentPopup.conObj.find(".start_date_time").val(dts[0].start_date);
                    this.currentPopup.conObj.find(".end_date_time").val(dts[0].end_date);
                    this.currentPopup.conObj.find(".mode_all").prop('checked',false);
                }else{
                    this.currentPopup.conObj.find(".mode_all").prop('checked',true);
                }
                
           }           
        }
        this.initPopSendTimeControl();
    }

    /**
     * @function 销毁对象
     */
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }
}