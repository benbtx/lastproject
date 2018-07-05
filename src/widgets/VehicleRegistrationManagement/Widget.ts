import BaseWidget = require('core/BaseWidget.class');
import Functions =require('core/Functions.module');
export = VehicleRegistrationManagement;
class VehicleRegistrationManagement extends BaseWidget {
    baseClass = "widget-VehicleRegistrationManagement";
    toast = null;
    popup = null;
    loadWait=null;
    currentPopup=null;
    editlabel="add";//默认状态是添加add，编辑edit
    keyword = "";
    select_info={
        datas:[],
        ids:[],
        id:"",
        currentTarget:null
    };
    gps_id="";//当前gps设备id

    companyid = "";//公司id
    companydatas=null;
    iszgs=false;//是否是总公司账号
    ispartment=false;
    depid="";

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
        if(this.iszgs==true){//集团公司账号
            this.companydatas=new Object(); 
            this.domObj.find(".company_serch").show();
            this.getCompanyList();           
            this.domObj.find('.company').on("change", function () {  
                this.companyid=this.domObj.find(".company option:selected").val();  
                this.setButtonInUse(this.companyid);           
                this.getInitGroup(true,this.domObj.find(".department")); 
            }.bind(this));  
        }else{            
            this.domObj.find(".company_serch").hide();
            if(this.ispartment){
                this.depid=AppX.appConfig.groupid;//获取部门id
                this.domObj.find(".department_btn").hide();  
                this.getVehicle();              
            }else{
                this.getInitGroup(true,this.domObj.find(".department"));//查询部门及员工列表信息
            }          
        }
    }

    /**
     * @function 是否可使用
     * @param companyid 所属公司id，当公司id和用户的公司id一致时，可进行编辑更新操作
     */
    setButtonInUse(companyid?:string){
        if(this.iszgs){//总公司账号
            if(companyid==AppX.appConfig.departmentid){//可使用
                this.domObj.find('.btn_add').prop('disabled',false);
                this.domObj.find('.btn_edit').prop('disabled',false);
                this.domObj.find('.btn_delete').prop('disabled',false);
                this.domObj.find('.btn_add_gps').prop('disabled',false);
                this.domObj.find('.btn_edit_gps').prop('disabled',false);
            }else{//不可使用
                this.domObj.find('.btn_add').prop('disabled',true);
                this.domObj.find('.btn_edit').prop('disabled',true);
                this.domObj.find('.btn_delete').prop('disabled',true);
                this.domObj.find('.btn_add_gps').prop('disabled',true);
                this.domObj.find('.btn_edit_gps').prop('disabled',true);
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
     * @function 获取公司列表信息
     */
    getCompanyList() {
        $.ajax({           
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getCompanyList,            
            success: function(results){  
                console.log(results);              
                var that = this;
                if (results.code != 1) {
                    that.toast.Show(results.message);
                    return;
                }
                var strdepartment = "";//"<option value=''>全部</option>";
                $.each(results.result, function (index, item) {
                    this.companydatas[item.companyid]=item.company_name;
                    if(AppX.appConfig.departmentid==item.companyid){
                        strdepartment += "<option selected value='" + item.companyid + "'>" + item.company_name + "</option>";
                    }else{
                        strdepartment += "<option value='" + item.companyid + "'>" + item.company_name + "</option>";
                    }   
                }.bind(this));
                this.domObj.find(".company").empty().append(strdepartment);
                this.companyid=this.domObj.find(".company option:selected").val(); 
                this.getInitGroup(true,this.domObj.find(".department")); 
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
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
     * @function 弹出框初始化时间控件
     */
    initTimeControl(){
         $.jeDate(".zb_register_date",{
            format: 'YYYY-MM-DD',   
            isinitVal: false
        });
         $.jeDate(".zb_issue_date",{
            format: 'YYYY-MM-DD',  
            isinitVal: false
        });
         $.jeDate(".install_time",{
            format: 'YYYY-MM-DD',  
            isinitVal: false
        });
    }

    /**
     * @function 事件初始化
     */
    initEvent() {
        var that=this;
        //查询 click
        this.domObj.find('.btn_search').on("click", function () {
            this.keyword = this.domObj.find('.plate_number').val();
            this.config.currentpage=1;
            this.getVehicle();
        }.bind(this));

        //刷新 click
        this.domObj.find('.btn_refresh').on("click", function () {  
            this.keyword =""; 
            this.config.currentpage=1;        
            this.getVehicle();
        }.bind(this));

        //登记 click
        this.domObj.find('.btn_add').on("click", function () {
            this.editlabel="add";  
            this.popup.setSize(this.config.popupsize.width, this.config.popupsize.height);
            var Obj = this.popup.Show("登记", this.template.split('$$')[1]);              
            this.currentPopup=Obj; 
           this.showInfo(null);                 
        }.bind(this));

        //更新 click
        this.domObj.find('.btn_edit').on("click", function () {
            var that=this;
            if (this.select_info.currentTarget == null) {
                this.toast.Show("请选择辆车！");
                return;
            }
            this.editlabel="edit";  
            this.popup.setSize(this.config.popupsize.width, this.config.popupsize.height);
            var Obj = this.popup.Show("更新", this.template.split('$$')[1]);              
            this.currentPopup=Obj;   
            this.showInfo(this.select_info.currentTarget);
        }.bind(this));          

        //删除 click
        this.domObj.find('.btn_delete').on("click", function () {
            if (this.select_info.ids.length==0) {
                this.toast.Show("请选择辆车！");
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
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteVehicle,
                    data: {
                        "list":this.select_info.ids
                    },
                    success: function(results){                    
                        if (results.code != 1) {
                            this.toast.Show(results.message);
                            return;
                        }                        
                        this.toast.Show(this.config.messages.delete);
                        this.config.currentpage=1;
                        this.getVehicle();
                    }.bind(this),
                    error: function (data) {
                        this.toast.Show(this.config.messages.delete);
                    }.bind(this)                    
                });
            }.bind(this));            
        }.bind(this));

        //注册GPS click
        this.domObj.find('.btn_add_gps').on("click", function () {
           this.editlabel="addgps";
           this.gpsInfo("注册GPS",2,null,600,360)
        }.bind(this));

        //修改GPS click
        this.domObj.find('.btn_edit_gps').on("click", function () {
           this.editlabel="updategps"; 
           if(this.select_info.currentTarget == null){
                this.toast.Show("请选择车辆！");
                return;
           }
           this.gpsInfo("修改GPS",3,this.select_info.currentTarget,600,360);
        }.bind(this));

        //GPS历程 click
        this.domObj.find('.btn_history_gps').on("click", function () {         
            this.popup.setSize(700, 500);
            var Obj = this.popup.Show("GPS安装历程查看", this.template.split('$$')[4],true);              
            this.currentPopup=Obj;   
            this.editlabel="showgpslist";         
            this.getCarList(false,this.currentPopup.conObj.find('.plate_number'),"id");
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
            var gps_id=$(e.currentTarget).data("gps_id");
            if(gps_id==""){//未注册gps
                this.domObj.find(".btn_edit_gps").prop("disabled",true);
            }else{
                this.domObj.find(".btn_edit_gps").prop("disabled",false);
            }
        });

        //上一页
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.config.currentpage - 1 > 0) {
                this.config.currentpage = this.config.currentpage - 1;
                this.getVehicle();
            }
        }.bind(this));

        //下一页
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.config.currentpage + 1 <= this.config.pagenumber) {
                this.config.currentpage = this.config.currentpage + 1;
                this.getVehicle();
            }
        }.bind(this));

        //返回
        this.domObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.config.pagenumber && currpage >= 1) {
                this.config.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.getVehicle();
            }
        }.bind(this));

        //页面条数控件
        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            this.config.pagesize = parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            this.getVehicle();
        }.bind(this));

        //全选
        this.domObj.find('.select_car_all_list').off("change").on("change", function () {
            if (this.domObj.find(".select_car_all_list").prop('checked') == true) {
                this.domObj.find(".select_car_list").each(function () {                    
                    $(this).prop('checked', true);
                    that.removeOrAddSelectItem(true,$(this));
                });
            } else {
                this.domObj.find(".select_car_list").each(function () {
                    $(this).prop('checked', false);
                    that.removeOrAddSelectItem(false,$(this));
                });
            }
        }.bind(that));       
    }

    /**
     * @function 获取车辆信息列表
     */
    getVehicle() {
        if(this.ispartment==false){
            this.depid=this.domObj.find('.department option:selected').val();
        } 
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj);   
        this.domObj.find(".select_car_all_list").prop('checked',false);
        this.select_info={
            datas:[],
            ids:[],
            id:"",
            currentTarget:null
        };  
        $.ajax({
            headers:this.getHeaders(0),
            type: "POST",
            dataType: "json",           
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleList,
            data: {
                "pageindex": this.config.currentpage,
                "pagesize": this.config.pagesize,
                "companyid":this.companyid,
                "depid":this.depid,
                "keyword": this.keyword
            },
            success: this.getVehicleListCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show(this.config.messages.other);
            }.bind(this)
        });
    }
    getVehicleListCallback(results) {
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
            var install_time=(item.gps_install_time!=null?item.gps_install_time.split(" ")[0]:"") ;
            html_trs_data += "<tr class='goto'  data-id='" + item.id
             + "' data-plate_number='" + item.plate_number 
             + "' data-zb_car_typeid='" + item.zb_car_typeid
             + "' data-maxspeed='" + item.maxspeed
             + "' data-zb_address='" + item.zb_address 
             + "' data-zb_use_properties='" + item.zb_use_properties
             + "' data-zb_brand_model='" + item.zb_brand_model
             + "' data-zb_vehicle_code='" + item.zb_vehicle_code
             + "' data-zb_engine_number='" + item.zb_engine_number
             + "' data-zb_register_date='" + item.zb_register_date
             + "' data-zb_issue_date='" + item.zb_issue_date
             + "' data-fb_file_number='" + item.fb_file_number
             + "' data-fb_approved_passenger='" + item.fb_approved_passenger
             + "' data-fb_total_mass='" + item.fb_total_mass
             + "' data-fb_toverall_size='" + item.fb_toverall_size
             + "' data-fb_traction_mass='" + item.fb_traction_mass
             + "' data-fb_tinspection_record='" + item.fb_tinspection_record
             + "' data-diving_license='" + item.diving_license
             + "' data-depid='" + item.depid
             + "' data-charge_user='" + item.charge_user
             + "' data-notes='" + item.notes
             + "' data-icon='" + JSON.stringify(item.icons)
             + "' data-state='" + item.state 
             + "' data-cartype='" + item.cartype
             + "' data-owner='" + item.owner
             + "' data-gps_id='" + (item.gps_id?item.gps_id:"")
             + "' data-gps_device_code='" + item.gps_device_code
             + "' data-gps_device_model='" + item.gps_device_model
             + "' data-gps_device_phone='" + item.gps_device_phone
             + "' data-install_time='" + install_time          
             + "'><td class='checkwidth'><input type='checkbox' class='select_car_list' data-id='" + item.id
             + "' data-plate_number='" + item.plate_number 
             + "' data-maxspeed='" + item.maxspeed
             + "' data-zb_car_typeid='" + item.zb_car_typeid
             + "' data-zb_address='" + item.zb_address 
             + "' data-zb_use_properties='" + item.zb_use_properties
             + "' data-zb_brand_model='" + item.zb_brand_model
             + "' data-zb_vehicle_code='" + item.zb_vehicle_code
             + "' data-zb_engine_number='" + item.zb_engine_number
             + "' data-zb_register_date='" + item.zb_register_date
             + "' data-zb_issue_date='" + item.zb_issue_date
             + "' data-fb_file_number='" + item.fb_file_number
             + "' data-fb_approved_passenger='" + item.fb_approved_passenger
             + "' data-fb_total_mass='" + item.fb_total_mass
             + "' data-fb_toverall_size='" + item.fb_toverall_size
             + "' data-fb_traction_mass='" + item.fb_traction_mass
             + "' data-fb_tinspection_record='" + item.fb_tinspection_record
             + "' data-diving_license='" + item.diving_license
             + "' data-depid='" + item.depid
             + "' data-charge_user='" + item.charge_user
             + "' data-notes='" + item.notes
             + "' data-icon='" + JSON.stringify(item.icons)
             + "' data-state='" + item.state 
             + "' data-owner='" + item.owner
             + "' data-cartype='" + item.cartype
             + "' data-gps_id='" + (item.gps_id?item.gps_id:"")
             + "' data-gps_device_code='" + item.gps_device_code
             + "' data-gps_device_model='" + item.gps_device_model
             + "' data-gps_device_phone='" + item.gps_device_phone
             + "' data-install_time='" + install_time  
             +"'/></td><td title='"+item.depname+"'>" + item.depname + "</td><td title='"+item.plate_number+"'>" 
             + item.plate_number + "</td><td title='"+item.maxspeed+"'>" 
             + item.maxspeed + "</td><td title='"+(item.state==1||item.state==0?this.config.isrun[item.state]:"")+"'>" 
             + (item.state==1||item.state==0?this.config.isrun[item.state]:"") + "</td><td title='"+item.car_type_name+"'>"
             + item.car_type_name + "</td><td title='"+item.charge_user+"'>" 
             + item.charge_user + "</td><td title='"+item.gps_device_code+"'>"
             + item.gps_device_code + "</td><td title='"+item.gps_device_phone+"'>" 
             + item.gps_device_phone + "</td><td title='"+install_time+"'>"
             + install_time + "</td><td title='"+item.create_time+"'>"
             + item.create_time + "</td><td><a class='operation' data-id='" 
             + item.id
             + "' data-plate_number='" + item.plate_number 
             + "' data-zb_car_typeid='" + item.zb_car_typeid
             + "' data-maxspeed='" + item.maxspeed
             + "' data-zb_address='" + item.zb_address 
             + "' data-zb_use_properties='" + item.zb_use_properties
             + "' data-zb_brand_model='" + item.zb_brand_model
             + "' data-zb_vehicle_code='" + item.zb_vehicle_code
             + "' data-zb_engine_number='" + item.zb_engine_number
             + "' data-zb_register_date='" + item.zb_register_date
             + "' data-zb_issue_date='" + item.zb_issue_date
             + "' data-fb_file_number='" + item.fb_file_number
             + "' data-fb_approved_passenger='" + item.fb_approved_passenger
             + "' data-fb_total_mass='" + item.fb_total_mass
             + "' data-fb_toverall_size='" + item.fb_toverall_size
             + "' data-fb_traction_mass='" + item.fb_traction_mass
             + "' data-fb_tinspection_record='" + item.fb_tinspection_record
             + "' data-diving_license='" + item.diving_license
             + "' data-depid='" + item.depid
             + "' data-charge_user='" + item.charge_user
             + "' data-notes='" + item.notes
             + "' data-icon='" + JSON.stringify(item.icons)
             + "' data-state='" + item.state
             + "' data-owner='" + item.owner
             + "' data-cartype='" + item.cartype
             + "' data-gps_id='" + (item.gps_id?item.gps_id:"")
             + "' data-gps_device_code='" + item.gps_device_code
             + "' data-gps_device_model='" + item.gps_device_model
             + "' data-gps_device_phone='" + item.gps_device_phone
             + "' data-install_time='" + install_time
             +"'>查看详细</a></td></tr>";           
        }.bind(this));
        this.domObj.find(".vehiclelist").empty().append(html_trs_data);   
        
        //查看详细
        this.domObj.find(".operation").off("click").on("click", function (e) {  
            this.select_info.currentTarget=$(e.currentTarget);
            this.editlabel="detail";  
            this.popup.setSize(this.config.popupsize.width, this.config.popupsize.height);
            var Obj = this.popup.Show("详细信息", this.template.split('$$')[5],true);              
            this.currentPopup=Obj;                      
            this.showInfo($(e.currentTarget));
        }.bind(that)); 

        //勾选
        this.domObj.find('.select_car_list').off("change").on("change",function(e){  
            this.removeOrAddSelectItem(e.currentTarget.checked,$(e.currentTarget));
        }.bind(that));    
    }  


    /**
     * @function 获取车辆Gps信息列表
     */
    getVehicleGps() { 
        this.loadWait.Show("正在查询数据，请耐心等待...",this.currentPopup.conObj);
        var plate_number=this.currentPopup.conObj.find(".plate_number option:selected").text();
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            dataType: "json",           
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleGps,
            data: {
                "pageindex": this.config.sbcurrentpage,
                "pagesize": this.config.sbpagesize,
                "plate_number": plate_number
            },
            success: this.getVehicleGpsListCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show(this.config.messages.other);
            }.bind(this)
        });
    }
    getVehicleGpsListCallback(results) {
        console.log(results);
        this.loadWait.Hide();    
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        if (results.result.total % this.config.sbpagesize == 0) {
            this.config.sbpagenumber = Math.floor(parseInt(results.result.total) / parseInt(this.config.sbpagesize));
        } else {
            this.config.sbpagenumber = Math.floor(parseInt(results.result.total) / parseInt(this.config.sbpagesize)) + 1;
        }

        //为分页控件添加信息
        this.currentPopup.conObj.find(".pagecontrol").text("总共" + results.result.total + "条，每页");
        this.currentPopup.conObj.find(".pagecontent").text("第" + that.config.sbcurrentpage + "页共" + that.config.sbpagenumber + "页");
     
        if (this.config.sbpagenumber == 0) {
            this.domObj.find(".pagecontrol").text("总共-条，每页-条");
            this.domObj.find(".content").text("第-页共-页");
        }
        var html_trs_data = "";
        $.each(results.result.rows, function (i, item) {
            var install_time=(item.install_time!=null?item.install_time.split(" ")[0]:"") ;            
            html_trs_data += "<tr class='goto checkwidth'><td title='"+(i+1)+"'>" 
             + (i+1) + "</td><td title='"+item.gps_device_code+"'>" 
             + item.gps_device_code + "</td><td title='"+item.gps_device_model+"'>" 
             + item.gps_device_model + "</td><td title='"+item.gps_device_phone+"'>" 
             + item.gps_device_phone + "</td><td title='"+install_time+"'>"
             + install_time + "</td></tr>";           
        }.bind(this));
        this.currentPopup.conObj.find(".vehiclegpstlist").empty().append(html_trs_data);

         //上一页
        this.currentPopup.conObj.find(".pre").off("click").on("click", function () {
            if (this.config.sbcurrentpage - 1 > 0) {
                this.config.sbcurrentpage = this.config.sbcurrentpage - 1;
                this.getVehicleGps();
            }
        }.bind(this));

        //下一页
        this.currentPopup.conObj.find(".next").off("click").on("click", function () {
            if (this.config.sbcurrentpage + 1 <= this.config.sbpagenumber) {
                this.config.sbcurrentpage = this.config.sbcurrentpage + 1;
                this.getVehicleGps();
            }
        }.bind(this));

        //返回
        this.currentPopup.conObj.find(".pageturning").off("click").on("click", function () {
            var currpage = parseInt(this.domObj.find(".currpage").val());
            if (currpage <= this.config.sbpagenumber && currpage >= 1) {
                this.config.sbcurrentpage = parseInt(this.currentPopup.conObj.find(".currpage").val());
                this.getVehicleGps();
            }
        }.bind(this));

         //页面条数控件
        this.currentPopup.conObj.find(".dynamic_pagesize").off("change").on("change", function () {
            this.config.sbpagesize = parseInt(this.currentPopup.conObj.find(".dynamic_pagesize option:selected").val());
            this.getVehicleGps();
        }.bind(this));

         //刷新 click
        this.currentPopup.conObj.find('.btn_search').on("click", function () { 
            this.config.sbcurrentpage=1;
            this.getVehicleGps();
        }.bind(this));
    }   

    /**
     * @function 显示当前数据，可编辑，添加
     * @param target 对象
     */
    showInfo(target){        
        var upload;
        var isadd=false;    
        if(target!=null){
            var icons=[],pics=[],pic_ids=[];
            if(target.data("icon") && target.data("icon")!=""){
                    icons=target.data("icon");
                    for(var i=0;i<icons.length;i++){
                        pic_ids.push(icons[i].id);
                        pics.push(AppX.appConfig.xjapipicroot+icons[i].filename);
                    }
            }            
           if(this.editlabel=='detail'){
               upload = ImgUpload('#vehicleImg', {num:4,path:"/",pics:pics,pic_ids:pic_ids,recallfunc:this.recallfunc.bind(this),onlyshow:true}); //照片处理 
           }else{
                upload = ImgUpload('#vehicleImg', {num:4,path:"/",pics:pics,pic_ids:pic_ids,recallfunc:this.recallfunc.bind(this)}); //照片处理
           }
                       
            this.currentPopup.conObj.find('.maxspeed').val(target.data("maxspeed"));
            this.currentPopup.conObj.find('.plate_number').val(target.data("plate_number"));
            this.currentPopup.conObj.find('.zb_address').val(target.data("zb_address"));
            this.currentPopup.conObj.find('.owner').val(target.data("owner"));
            this.currentPopup.conObj.find('.zb_use_properties').val(target.data("zb_use_properties"));
            this.currentPopup.conObj.find('.zb_brand_model').val(target.data("zb_brand_model"));
            this.currentPopup.conObj.find('.zb_vehicle_code').val(target.data("zb_vehicle_code"));
            this.currentPopup.conObj.find('.zb_engine_number').val(target.data("zb_engine_number"));
            this.currentPopup.conObj.find('.zb_register_date').val(target.data("zb_register_date"));
            this.currentPopup.conObj.find('.zb_issue_date').val(target.data("zb_issue_date"));
            this.currentPopup.conObj.find('.fb_file_number').val(target.data("fb_file_number"));
            this.currentPopup.conObj.find('.fb_approved_passenger').val(target.data("fb_approved_passenger"));
            this.currentPopup.conObj.find('.fb_total_mass').val(target.data("fb_total_mass"));
            this.currentPopup.conObj.find('.fb_toverall_size').val(target.data("fb_toverall_size"));
            this.currentPopup.conObj.find('.fb_traction_mass').val(target.data("fb_traction_mass"));
            this.currentPopup.conObj.find('.fb_tinspection_record').val(target.data("fb_tinspection_record"));
            this.currentPopup.conObj.find('.diving_license').val(target.data("diving_license"));           
            this.currentPopup.conObj.find('.notes').val(target.data("notes")); 
            this.currentPopup.conObj.find('.cartype').val(target.data("cartype"));  
            this.currentPopup.conObj.find('.charge_user').val(target.data("charge_user"));                     
            if(target.data("install_time")!=""){   
                this.currentPopup.conObj.find(".addgps").text("重新注册GPS设备");
                isadd=true;
                if(this.editlabel!='detail'){
                    this.currentPopup.conObj.find(".gps_device_code").prop("disabled",false);
                    this.currentPopup.conObj.find(".gps_device_model").prop("disabled",false);
                    this.currentPopup.conObj.find(".gps_device_phone").prop("disabled",false);
                    this.currentPopup.conObj.find(".install_time").prop("disabled",false);
                }            
                
                this.currentPopup.conObj.find('.gps_device_code').val(target.data("gps_device_code"));
                this.currentPopup.conObj.find('.gps_device_model').val(target.data("gps_device_model"));
                this.currentPopup.conObj.find('.gps_device_phone').val(target.data("gps_device_phone"));
                this.currentPopup.conObj.find('.install_time').val(target.data("install_time"));
            }else{
                this.currentPopup.conObj.find(".addgps").text("新增GPS设备资料");
            }
        }else{
            upload = ImgUpload('#vehicleImg', {num:4,path:"/",recallfunc:this.recallfunc.bind(this)});
        }

         //新增gps设备信息
        this.currentPopup.conObj.find('.car_gps_install').off("change").on("change",function(){ 
                if(this.editlabel=="edit"){//编辑重新注册
                    if (this.currentPopup.conObj.find(".car_gps_install").prop('checked') == true) {
                        this.currentPopup.conObj.find(".gps_device_code").val("");
                        this.currentPopup.conObj.find(".gps_device_model").val("");
                        this.currentPopup.conObj.find(".gps_device_phone").val("");
                        this.currentPopup.conObj.find(".install_time").val("");
                        this.currentPopup.conObj.find(".gps_device_code").attr("disabled",false);
                        this.currentPopup.conObj.find(".gps_device_model").attr("disabled",false);
                        this.currentPopup.conObj.find(".gps_device_phone").attr("disabled",false);
                        this.currentPopup.conObj.find(".install_time").attr("disabled",false); 
                    } else {
                        this.currentPopup.conObj.find('.gps_device_code').val(target.data("gps_device_code"));
                        this.currentPopup.conObj.find('.gps_device_model').val(target.data("gps_device_model"));
                        this.currentPopup.conObj.find('.gps_device_phone').val(target.data("gps_device_phone"));
                        this.currentPopup.conObj.find('.install_time').val(target.data("install_time"));
                        this.currentPopup.conObj.find(".gps_device_code").attr("disabled",true);
                        this.currentPopup.conObj.find(".gps_device_model").attr("disabled",true);
                        this.currentPopup.conObj.find(".gps_device_phone").attr("disabled",true);
                        this.currentPopup.conObj.find(".install_time").attr("disabled",true);                     
                    }
                        
                } else{
                    this.currentPopup.conObj.find(".gps_device_code").val("");
                    this.currentPopup.conObj.find(".gps_device_model").val("");
                    this.currentPopup.conObj.find(".gps_device_phone").val("");
                    this.currentPopup.conObj.find(".install_time").val("");
                    if (this.currentPopup.conObj.find(".car_gps_install").prop('checked') == true) {                        
                        this.currentPopup.conObj.find(".gps_device_code").attr("disabled",false);
                        this.currentPopup.conObj.find(".gps_device_model").attr("disabled",false);
                        this.currentPopup.conObj.find(".gps_device_phone").attr("disabled",false);
                        this.currentPopup.conObj.find(".install_time").attr("disabled",false); 
                    } else {                       
                        this.currentPopup.conObj.find(".gps_device_code").attr("disabled",true);
                        this.currentPopup.conObj.find(".gps_device_model").attr("disabled",true);
                        this.currentPopup.conObj.find(".gps_device_phone").attr("disabled",true);
                        this.currentPopup.conObj.find(".install_time").attr("disabled",true);                     
                    }
                } 
            }.bind(this));
        this.getStartQy();
        this.initTimeControl();       
        this.getCarType();//车辆类型
        
        (<any>$('#widget-vehicletypemanagement_addpopup')).bootstrapValidator();
        //提交保存
        this.currentPopup.submitObj.off("click").on("click", function () {
                var platenumber = this.currentPopup.conObj.find('.plate_number');
                var maxspeed= this.currentPopup.conObj.find('.maxspeed').val();  
                var fb_approved_passenger= this.currentPopup.conObj.find('.fb_approved_passenger').val();  
                var fb_total_mass= this.currentPopup.conObj.find('.fb_total_mass').val();  
                var fb_traction_mass=  this.currentPopup.conObj.find('.fb_traction_mass').val();                          
                if (platenumber.val() == '') {
                    platenumber.addClass('has-error');                       
                    this.popup.ShowTip("车牌号不能为空！");
                    return;
                } 

                if(this.isVehicleNumber(platenumber.val())==false){
                    platenumber.addClass('has-error');                       
                    this.popup.ShowTip("车牌号填写不正确！");
                    return;
                }

                if(maxspeed!="" && isNaN(maxspeed)){
                    this.popup.ShowTip("上限速度填写不正确！");
                    return;
                }

                if(fb_approved_passenger!="" && isNaN(fb_approved_passenger)){
                    this.popup.ShowTip("核定载人数填写不正确！");
                    return;
                }

                if(fb_total_mass!="" && isNaN(fb_total_mass)){
                    this.popup.ShowTip("总质量填写不正确！");
                    return;
                }

                if(fb_traction_mass!="" && isNaN(fb_traction_mass)){
                    this.popup.ShowTip("准牵引总质量填写不正确！");
                    return;
                }

                if(this.currentPopup.conObj.find(".car_gps_install").prop('checked')==true){//新增勾选
                    var gps_device_code=this.currentPopup.conObj.find('.gps_device_code');
                    var install_time=  this.currentPopup.conObj.find('.install_time');
                    if(gps_device_code.val()==''){
                        gps_device_code.addClass('has-error');                       
                        this.popup.ShowTip("GPS设备编号不能为空！");
                        return;
                    }

                    if(install_time.val()==''){
                        install_time.addClass('has-error');                       
                        this.popup.ShowTip("GPS安装时间不能为空！");
                        return;
                    }
                }
                var opt={
                    'datas':[],
                    'url':AppX.appConfig.xjapiroot.replace(/\/+$/, "") + (this.editlabel=="add"?this.config.addVehicle:this.config.updateVehicle),
                    'Token':AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                    'success':function(res){
                        var results=JSON.parse(res)
                        if(results.code!=1){
                            this.popup.ShowTip(results.message);
                            return;
                        }
                        this.popup.Close();
                        this.toast.Show(this.editlabel=="add"?this.config.messages.add:this.config.messages.update);
                        this.getVehicle();                         
                    }.bind(this),
                    'error':function(res){
                        var results=JSON.parse(res)
                        this.popup.ShowTip(results.message);
                    }.bind(this)
                }                   
                opt.datas.push({name:"plate_number",value:platenumber.val()});
                if(target!=null)
                    opt.datas.push({name:"id",value:target.data("id")});
                opt.datas.push({name:"maxspeed",value:maxspeed});
                opt.datas.push({name:"zb_car_typeid",value:this.currentPopup.conObj.find('.zb_car_typeid').val()}); 
                opt.datas.push({name:"zb_address",value:this.currentPopup.conObj.find('.zb_address').val()}); 
                opt.datas.push({name:"zb_use_properties",value:this.currentPopup.conObj.find('.zb_use_properties').val()}); 
                opt.datas.push({name:"zb_brand_model",value:this.currentPopup.conObj.find('.zb_brand_model').val()}); 
                opt.datas.push({name:"zb_vehicle_code",value:this.currentPopup.conObj.find('.zb_vehicle_code').val()}); 
                opt.datas.push({name:"zb_engine_number",value:this.currentPopup.conObj.find('.zb_engine_number').val()}); 
                opt.datas.push({name:"zb_register_date",value:this.currentPopup.conObj.find('.zb_register_date').val()}); 
                opt.datas.push({name:"zb_issue_date",value:this.currentPopup.conObj.find('.zb_issue_date').val()}); 
                opt.datas.push({name:"fb_file_number",value:this.currentPopup.conObj.find('.fb_file_number').val()}); 
                opt.datas.push({name:"fb_approved_passenger",value:fb_approved_passenger}); 
                opt.datas.push({name:"fb_total_mass",value:fb_total_mass}); 
                opt.datas.push({name:"fb_toverall_size",value:this.currentPopup.conObj.find('.fb_toverall_size').val()}); 
                opt.datas.push({name:"fb_traction_mass",value:fb_traction_mass}); 
                opt.datas.push({name:"fb_tinspection_record",value:this.currentPopup.conObj.find('.fb_tinspection_record').val()}); 
                opt.datas.push({name:"diving_license",value:this.currentPopup.conObj.find('.diving_license').val()}); 
                opt.datas.push({name:"depid",value:this.currentPopup.conObj.find('.depid').val()}); 
                opt.datas.push({name:"charge_user",value:this.currentPopup.conObj.find('.charge_user').val()}); 
                opt.datas.push({name:"notes",value:this.currentPopup.conObj.find('.notes').val()}); 
                opt.datas.push({name:"owner",value:this.currentPopup.conObj.find('.owner').val()}); 
                opt.datas.push({name:"cartype",value:this.currentPopup.conObj.find('.cartype').val()});
                opt.datas.push({name:"state",value:this.currentPopup.conObj.find('.state option:selected').val()}); 
                
                if(isadd==true && this.editlabel=="edit"){//已注册了gps信息
                    opt.datas.push({name:"car_gps_reinstall",value:this.currentPopup.conObj.find(".car_gps_install").prop('checked')});
                    opt.datas.push({name:"car_gps_install",value:true});
                    opt.datas.push({name:"gps_device_code",value:this.currentPopup.conObj.find('.gps_device_code').val()}); 
                    opt.datas.push({name:"gps_device_model",value:this.currentPopup.conObj.find('.gps_device_model').val()}); 
                    opt.datas.push({name:"gps_device_phone",value:this.currentPopup.conObj.find('.gps_device_phone').val()}); 
                    opt.datas.push({name:"install_time",value:this.currentPopup.conObj.find('.install_time').val()});
                } else{
                        if(this.currentPopup.conObj.find(".car_gps_install").prop('checked')==true){ 
                            opt.datas.push({name:"car_gps_install",value:true});                       
                            opt.datas.push({name:"gps_device_code",value:this.currentPopup.conObj.find('.gps_device_code').val()}); 
                            opt.datas.push({name:"gps_device_model",value:this.currentPopup.conObj.find('.gps_device_model').val()}); 
                            opt.datas.push({name:"gps_device_phone",value:this.currentPopup.conObj.find('.gps_device_phone').val()}); 
                            opt.datas.push({name:"install_time",value:this.currentPopup.conObj.find('.install_time').val()}); 
                        }
                    }       
                upload.uploadImg(opt);              
        }.bind(this));                             
    }

    /**
     * @function 重复图片上传提示
     */
    recallfunc(){
        this.popup.ShowTip("不能重复上传命名相同的图片！");
    }


    /**
     * @function 注册GPS
     * @param title 标题
     * @param idx 
     * @param target
     * @param width 宽度
     * @param height 高度
     */
    gpsInfo(title,idx,target,width,height){
        this.popup.setSize(width, height);
        var Obj = this.popup.Show(title, this.template.split('$$')[idx]);              
        this.currentPopup=Obj;
        this.gps_id="";
        if(target!=null){//修改gps
            this.gps_id=target.data("gps_id");          
            this.currentPopup.conObj.find('.plate_number').val(target.data("plate_number"));           
            this.currentPopup.conObj.find('.gps_device_code').val(target.data("gps_device_code"));
            this.currentPopup.conObj.find('.gps_device_model').val(target.data("gps_device_model"));
            this.currentPopup.conObj.find('.gps_device_phone').val(target.data("gps_device_phone"));
            this.currentPopup.conObj.find('.install_time').val(target.data("install_time"));             
        }else{//重新注册GPS设备            
            this.getCarList(false,this.currentPopup.conObj.find('.plate_number'),"id");       
        }
        $.jeDate(".install_time",{
            format: 'YYYY-MM-DD',  
            isinitVal: false,
            maxDate:Functions.DateFormat(new Date(),"yyyy-MM-dd")
        });
        //提交保存
        Obj.submitObj.off("click").on("click", function () {
                var platenumber =this.editlabel=="updategps"? this.currentPopup.conObj.find('.plate_number').val():this.currentPopup.conObj.find('.plate_number option:selected').text();
                var gps_device_code=this.currentPopup.conObj.find('.gps_device_code');
                var install_time=  this.currentPopup.conObj.find('.install_time');
                if(gps_device_code.val()==''){
                    gps_device_code.addClass('has-error');                       
                    this.popup.ShowTip("GPS设备编号不能为空！");
                    return;
                }

                if(install_time.val()==''){
                    install_time.addClass('has-error');                       
                    this.popup.ShowTip("GPS安装时间不能为空！");
                    return;
                }
               
                $.ajax({
                    headers:this.getHeaders(1),
                    type: "POST",
                    dataType: "json",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + (this.editlabel=="addgps"?this.config.addVehicleGps:this.config.updateVehicleGps),
                    data: {
                      "id":this.gps_id,
                      "gps_device_code":gps_device_code.val(),
                      "gps_device_model":this.currentPopup.conObj.find('.gps_device_model').val(),
                      "gps_device_phone":this.currentPopup.conObj.find('.gps_device_phone').val(),
                      "install_time":install_time.val(),
                      "carid":platenumber
                    },
                    success: function(results){
                        if(results.code!=1){
                            this.popup.ShowTip(results.message);
                            return;
                        }
                        this.popup.Close();
                        this.toast.Show(this.config.messages[this.editlabel]);
                        this.getVehicle();
                    }.bind(this),
                    error: function (data) {
                         this.popup.ShowTip(this.config.messages.other);
                    }.bind(this)
                });                            
        }.bind(this));  
    }

    /**----------------------------字典获取------------------------- */
    /**
     * @function 部门列表
     * @param isall 是否显示全部
     * @param obj 对象
     */
    getInitGroup(isall,obj) {
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
                this.getVehicle();               
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json"
        });
    }
    
    /**
     * @function 获取部门列表
     */
    getGroup() {
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            dataType: "json",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "companyid":this.companyid
            },
            success: this.getGroupListCallback.bind(this),
            error: function (data) {
                this.toast.Show(this.config.messages.other);
            }.bind(this)
        });
    }
    getGroupListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        var strdepartment = "";
        $.each(results.result.rows, function (index, item) {            
            if((this.editlabel=="edit"||this.editlabel=="detail")&&this.select_info.currentTarget!=null&&this.select_info.currentTarget.data("depid")==item.id){
                strdepartment += "<option selected value='" + item.id + "'>" + item.name + "</option>";
            }else{
                strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";
            }            
        }.bind(this));
        this.currentPopup.conObj.find(".depid").empty().append(strdepartment);        
    }

    /**
     * @function 获取车辆类型
     */
    getCarType(){
        $.ajax({
                headers: this.getHeaders(0),
                type: "POST",                
                dataType: "json",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleTypeList,
                data: {
                    "pageindex": 1,
                    "pagesize": this.config.maxsize,
                    "key":this.config.key
                },
                success: function (result) {
                    console.log(result);
                    if (result.code != 1) {
                        this.toast.Show(result.message);
                        return;
                    }
                    var stroption = "";
                    result.result.rows.forEach(function (row) {
                        if(this.select_info.currentTarget!=null&&this.select_info.currentTarget.data("zb_car_typeid")==row.id && (this.editlabel=="edit"||this.editlabel=="detail")){//编辑状态
                            stroption += "<option selected='selected' value='" + row.id + "'>" + row.value + "</option>";
                        }else{
                            stroption += "<option value='" + row.id + "'>" + row.value + "</option>";
                        }                        
                    }.bind(this));
                    this.currentPopup.conObj.find('.zb_car_typeid').empty().append(stroption);
                    this.getGroup();
                }.bind(this),
                error: function (data) {
                    this.popup.ShowTip(this.config.messages.other);
                }.bind(this)
            });
    }

    /**
     * @function 车辆启用状态
     */
    getStartQy(){
        var optstr="";
        for(var i=0;i<this.config.isdicdata.length;i++){
            var row=this.config.isdicdata[i];
            if(this.select_info.currentTarget!=null&&this.select_info.currentTarget.data("state")==row.id && (this.editlabel=="edit"||this.editlabel=="detail")){//编辑状态
                optstr += "<option selected='selected' value='" + row.id + "'>" + row.value + "</option>";
            }else{
                optstr += "<option value='" + row.id + "'>" + row.value + "</option>";
            } 
        }
         this.currentPopup.conObj.find('.state').empty().append(optstr);       
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
     * @function 车牌号验证
     */
    isVehicleNumber(vehicleNumber) {
      var result = false;
      if (vehicleNumber.length == 7){
        var express = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}[A-Z0-9]{4}[A-Z0-9挂学警港澳]{1}$/;
        result = express.test(vehicleNumber);
      }
      return result;
    }

     /**
     * @function 获取车辆列表
     * @param isall
     * @param obj
     * @param key
     */
    getCarList(isall,obj,key){
        $.ajax({
                headers: this.getHeaders(1),
                type: "POST",                
                dataType: "json",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleList,
                data: {
                    "pageindex": 1,
                    "pagesize": this.config.maxsize
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
                        if(this.select_info.currentTarget!=null&&this.select_info.currentTarget.data(key)==row.id){//编辑状态
                            stroption += "<option selected='selected' value='" +row.id + "'>" + row.plate_number + "</option>"; 
                        }else{
                            stroption += "<option value='" + row.id + "'>" + row.plate_number + "</option>";
                        }                                         
                    }.bind(this));
                    obj.empty().append(stroption);
                    if(this.editlabel=="showgpslist"){
                        this.getVehicleGps();
                    }
                }.bind(this),
                error: function (data) {
                    this.popup.ShowTip(this.config.messages.other);
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