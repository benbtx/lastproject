import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');
import Extent = require('esri/geometry/Extent');
import SpatialReference = require('esri/SpatialReference');
import Point = require("esri/geometry/Point");

import GraphicsLayer = require("esri/layers/GraphicsLayer");
import Graphic = require("esri/graphic");
import PictureMarkerSymbol = require("esri/symbols/PictureMarkerSymbol");
import TextSymbol = require("esri/symbols/TextSymbol");
import Font = require("esri/symbols/Font");
import ScreenPoint = require('esri/geometry/ScreenPoint');
import Draw = require('esri/toolbars/draw');
import Polygon = require('esri/geometry/Polygon');
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import Color = require("esri/Color");
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import BlankPanel = require('widgets/BlankPanel/Widget');
import Polyline = require('esri/geometry/Polyline');

import ClusterLayer = require('extras/ClusterLayer');
import arrayUtils = require('dojo/_base/array');
import ClassBreaksRenderer = require('esri/renderers/ClassBreaksRenderer');
import PopupTemplate = require('esri/dijit/PopupTemplate');

import Query = require('esri/tasks/query');
import QueryTask = require('esri/tasks/QueryTask');
import FeatureLayer = require('esri/layers/FeatureLayer');
import InfoTemplate = require('esri/InfoTemplate');
import SimpleRenderer = require('esri/renderers/SimpleRenderer');

import LoadWait=require('widgets/LoadWait/Widget');

export = VehicleWarnAreaManagement;

class VehicleWarnAreaManagement extends BaseWidget {
    baseClass = "widget-VehicleWarnAreaManagement";
    map = null;
    toast = null;
    popup = null;
    loadWait=null;
   
    warnAreaInfoGraphicLayer: GraphicsLayer;
    tempRegionGraphicLayer: GraphicsLayer;
    tempregionjson="";
    drawToolbar=null;
    select_info={
        datas:[],
        ids:[],
        id:"",
        currentTarget:null
    };
    objpup=null;
    keyword="";
    editlabel="add";
    companyid = "";//公司id
    companydatas=null;
    iszgs=false;//是否是总公司账号
    ispartment=false;

    /**
     * @function 启动初始化
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
        this.map = this.AppX.runtimeConfig.map;
        this.loadWait=this.AppX.runtimeConfig.loadWait;
        //片区图层
        if (this.map.getLayer("region_warnarea")) {
            return;
        } else {
            var graphicLayer = new GraphicsLayer();
            graphicLayer.id = "region_warnarea";
            this.warnAreaInfoGraphicLayer = graphicLayer;
            this.map.addLayer(graphicLayer);
        }
        if (this.map.getLayer("region_warnRegionGraphicLayer")) {
            return;
        } else {
            var tempRegionGraphicLayer = new GraphicsLayer();
            tempRegionGraphicLayer.id = "region_warnRegionGraphicLayer";
            this.tempRegionGraphicLayer = tempRegionGraphicLayer;
            this.map.addLayer(tempRegionGraphicLayer);
        }
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
       this.getRegionType(this.config.typekey,"region_type_id",this.domObj,true);//获取区域类型 
        if(this.iszgs==true){//集团公司账号
            this.companydatas=new Object(); 
            this.domObj.find(".company_serch").show();
            this.getCompanyList();           
            this.domObj.find('.company').on("change", function () {  
                this.companyid=this.domObj.find(".company option:selected").val();  
                this.setButtonInUse(this.companyid);
                this.getWarnArea();
            }.bind(this));  
        }else{            
            this.domObj.find(".company_serch").hide();  
            this.getWarnArea();                 
        }
    }

    /**
     * @function 是否可使用
     * @param companyid 所属公司id，当公司id和用户的公司id一致时，可进行编辑更新操作
     */
    setButtonInUse(companyid?:string){
        if(this.iszgs){//总公司账号
            if(companyid==AppX.appConfig.departmentid){//可使用
                this.domObj.find('.btn_addwarnregion').prop('disabled',false);
                this.domObj.find('.btn_editwarnregion').prop('disabled',false);
                this.domObj.find('.btn_deletewarnregion').prop('disabled',false);
                this.domObj.find('.btn_binding').prop('disabled',false);
            }else{//不可使用
                this.domObj.find('.btn_addwarnregion').prop('disabled',true);
                this.domObj.find('.btn_editwarnregion').prop('disabled',true);
                this.domObj.find('.btn_deletewarnregion').prop('disabled',true);
                this.domObj.find('.btn_binding').prop('disabled',true);
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
                this.getWarnArea();
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
     * @function 
     */
    initClear(){
        this.tempregionjson="";
        if(this.drawToolbar!=null){
            this.drawToolbar.deactivate();
            this.map.setMapCursor('default');
        }           
        this.warnAreaInfoGraphicLayer.clear();
        this.tempRegionGraphicLayer.clear();
        this.select_info={
            datas:[],
            ids:[],
            id:"",
            currentTarget:null
        };
    }   

     /**
     * @function 弹出框初始化时间控件
     */
    initTimeControl(){
        $.jeDate(".link_date",{
                format: 'YYYY-MM-DD',  
                isinitVal: false,
                minDate:Functions.DateFormat(new Date((new Date()).getTime()+24*3600000),"yyyy-MM-dd")
            });
        if(this.editlabel=="add"){
             $.jeDate(".start_date",{
                format: 'YYYY-MM-DD',  
                isinitVal: false,
                minDate:Functions.DateFormat(new Date((new Date()).getTime()+24*3600000),"yyyy-MM-dd")
            });
            $.jeDate(".end_date",{
                format: 'YYYY-MM-DD',  
                isinitVal: false,
                minDate:Functions.DateFormat(new Date((new Date()).getTime()+24*3600000),"yyyy-MM-dd")
            });             
        }else{
            $.jeDate(".start_date",{
                format: 'YYYY-MM-DD',  
                isinitVal: false,
                minDate:Functions.DateFormat(new Date((new Date()).getTime()+24*3600000),"yyyy-MM-dd")
            });
            $.jeDate(".end_date",{
                format: 'YYYY-MM-DD',  
                isinitVal: false,
                minDate:Functions.DateFormat(new Date((new Date()).getTime()+24*3600000),"yyyy-MM-dd")
            });
        }         
    }

    /**
     * 初始化事件
     */
    initEvent() {
        var that = this; 

        //搜索
        this.domObj.find('.btn-search').on("click", function () {
            this.keyword=this.domObj.find(".search_condition").val();
            this.getWarnArea();
        }.bind(this));

        //添加区域
        this.domObj.find('.btn_addwarnregion').on("click", function () {
            this.map.setMapCursor('crosshair');
            this.tempRegionGraphicLayer.clear();
            this.tempregionjson="";
            this.drawToolbar = new Draw(this.AppX.runtimeConfig.map);
            this.drawToolbar.activate(Draw.POLYGON);
            this.drawToolbar.on("draw-end", function (evt) {               
                this.map.setMapCursor('default');
                var graphic = new Graphic(evt.geometry, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT,
                        new Color([255, 0, 0]), 2), new Color([0, 0, 0, 0.5])
                ));
                this.tempregionjson = JSON.stringify(evt.geometry.toJson());               
                this.tempRegionGraphicLayer.add(graphic);
                this.drawToolbar.deactivate(); 

                this.editlabel="add";
                this.popup.setSize(this.config.popupsize.width, this.config.popupsize.height);
                var Obj = this.popup.Show("添加", this.template.split('$$')[1]);
                this.objpup=Obj;
                this.addOrEditRegion();             
            }.bind(this));
        }.bind(this));

        //片区编辑
        this.domObj.find('.btn_editwarnregion').on("click", function () { 
            if(this.select_info.id==""){
                this.toast.Show("请先选择报警区域！");
                return;
            }
            if(this.select_info.currentTarget.data("editable")=='0'){
                this.toast.Show("该报警区域不能修改！");
                return;
            }
            this.editlabel="edit";
            this.popup.setSize(this.config.popupsize.width, this.config.popupsize.height);
            var Obj = this.popup.Show("修改", this.template.split('$$')[1]);
            this.objpup=Obj;            
            this.addOrEditRegion();
        }.bind(this));

        //删除区域
        this.domObj.find('.btn_deletewarnregion').on("click", function () {
            if (this.select_info.datas.length==0) {
                this.toast.Show("请选择报警区域！");
                return;
            }
            for(var i=0;i<this.select_info.datas.length;i++){
                if(this.select_info.datas[i].editable=='0'){
                    this.toast.Show("选择数据中存在不能删除的报警区域！");
                    return;
                }
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
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteRegionAlarm,
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
                        this.getWarnArea();
                    }.bind(this),
                    error: function (data) {
                        this.toast.Show(this.config.messages.delete);
                    }.bind(this)                    
                });
            }.bind(this)); 

        }.bind(this));   

         //车辆绑定
        this.domObj.find('.btn_binding').on("click", function () {
           if(this.select_info.id==""){
                this.toast.Show("请先选择报警区域！");
                return;
            }
            this.bindRegion();
        }.bind(this));     

        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("id") == null) {
                return;
            } else {
                this.select_info.id = $(e.currentTarget).data("id");
                this.select_info.currentTarget=$(e.currentTarget);
            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
            var mapPolygon = new Polygon($(e.currentTarget).data("geometry"));
            this.map.setExtent(mapPolygon.getExtent());
        });

        //全选
        this.domObj.find('.select_region_all_list').off("change").on("change", function () {
            if (this.domObj.find(".select_region_all_list").prop('checked') == true) {
                this.domObj.find(".select_region_list").each(function () {                    
                    $(this).prop('checked', true);
                    that.removeOrAddSelectItem(true,$(this));
                });
            } else {
                this.domObj.find(".select_region_list").each(function () {
                    $(this).prop('checked', false);
                    that.removeOrAddSelectItem(false,$(this));
                });
            }
        }.bind(that));

        //上一页
        this.domObj.find(".pre").off("click").on("click", function () {
            if (this.config.currentpage - 1 > 0) {
                this.config.currentpage = this.config.currentpage - 1;
                this.keyword="";
                this.getWarnArea();               
            }

        }.bind(this));

        //下一页
        this.domObj.find(".next").off("click").on("click", function () {
            if (this.config.currentpage + 1 <= this.config.pagenumber) {
                this.config.currentpage = this.config.currentpage + 1;
                this.keyword="";
                this.getWarnArea();               
            }
        }.bind(this));
      
        //返回
        this.domObj.find(".pageturning").off("click").on("click", function () {
            if (parseInt(this.domObj.find(".currpage").val()) <= this.config.pagenumber && this.config.currentpage >= 1) {
                this.config.currentpage = parseInt(this.domObj.find(".currpage").val());
                this.keyword="";
                this.getWarnArea();               
            } else {
                this.domObj.find(".currpage").val("");
            }
        }.bind(this));

        //默认页条数修改
        this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
            this.config.pagesize= parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());
            this.keyword="";
            this.getWarnArea();            
        }.bind(this));
    }

    /**
     * @function 车辆绑定
     */
    bindRegion(){
        this.editlabel="edit";
        this.popup.setSize(this.config.popupsize.width,350);
        var Obj = this.popup.Show("车辆绑定", this.template.split('$$')[2]);
        this.objpup=Obj;
        Obj.conObj.find(".district_name").val(this.select_info.currentTarget.data("district_name"));
        var id=this.select_info.currentTarget.data("id");
        this.getCarList();
        this.objpup.submitObj.off("click").on("click", function () { 
            var district_name = this.objpup.conObj.find('.district_name');            
            var cars=this.getSelectCars();;
            $.ajax({
                    headers: this.getHeaders(1),
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.bindRegion,
                    data: {
                        "alarmregion_id":id,
                        "bindcarids":cars
                    },
                    success: function(results){
                            var that = this;       
                            if (results.code != 1) {
                                this.popup.ShowTip(results.message);
                                return;
                            } else {
                                this.popup.Close();
                                that.toast.Show("区域车辆设置成功！");
                                this.keyword="";                                          
                                this.getWarnArea(); 
                            } 
                        }.bind(this),
                        dataType: "json"
                    });
            }.bind(this));
    }

    /**
     * @function 获取绑定的车辆集合
     */
    getSelectCars(){
        var listcars= this.objpup.conObj.find(".select_car_list");
        var cars=[];
        for(var i=0;i<listcars.length;i++){
            if(listcars[i].checked==true){               
                cars.push($(listcars[i]).data("plate_number"));
            }
        }
        return cars;
    }

    /**
     * @function 添加报警区域
     */
    addOrEditRegion(){
        var id="";
        if(this.editlabel=="edit" && this.select_info.currentTarget!=null){
            id=this.select_info.currentTarget.data("id");
            this.objpup.conObj.find('.district_name').val(this.select_info.currentTarget.data("district_name"));
            this.objpup.conObj.find('.limit_speed').val(this.select_info.currentTarget.data("limit_speed"));
            this.objpup.conObj.find('.start_date').val(this.select_info.currentTarget.data("start_date"));
            this.objpup.conObj.find('.end_date').val(this.select_info.currentTarget.data("end_date"));
            this.objpup.conObj.find('.cars').val(this.select_info.currentTarget.data("cars"));
            this.objpup.conObj.find('.link_date').val(this.select_info.currentTarget.data("excutedate"));
            this.tempregionjson=JSON.stringify(this.select_info.currentTarget.data("geometry"));
        }
        this.initTimeControl();
        this.getStartQy();//是否启用
        this.getRegionType(this.config.typekey,"region_type_id",this.objpup.conObj,false);//获取区域类型
        this.getRegionType(this.config.excukey,"executiong_mode_id",this.objpup.conObj,false);//执行方式
        this.getCarList();
        this.objpup.domObj.find('.btn-close').off("click").on("click",function(){                
            this.tempRegionGraphicLayer.clear();
            this.popup.Close();
        }.bind(this));

        this.objpup.domObj.find('.btn-hide').off("click").on("click",function(){                
            this.tempRegionGraphicLayer.clear();
            this.popup.Close();
        }.bind(this));

        this.objpup.submitObj.off("click").on("click", function () { 
            var district_name = this.objpup.conObj.find('.district_name');
            var limit_speed = this.objpup.conObj.find('.limit_speed');
            var region_type_id = this.objpup.conObj.find('.region_type_id option:selected');
            var start_date=this.objpup.conObj.find('.start_date');
            var end_date=this.objpup.conObj.find('.end_date');
            var state=this.objpup.conObj.find('.state');
            var link_date=this.objpup.conObj.find('.link_date');
            var cars=this.getSelectCars();
            var executiong_mode_id=this.objpup.conObj.find(".executiong_mode_id");
            if (district_name.val() == "") {
                district_name.addClass('has-error');                       
                this.popup.ShowTip("区域名称不能为空！");
                return;
            }
            if (region_type_id.text().indexOf('车速')>-1) {
                if(limit_speed.val()==""){
                    limit_speed.addClass('has-error');                       
                    this.popup.ShowTip("限速不能为空！");
                    return;
                }else if(isNaN(limit_speed.val())){
                    limit_speed.addClass('has-error');                       
                    this.popup.ShowTip("限速填写不正确！");
                    return;
                }else if(parseFloat(limit_speed.val())<0){
                    limit_speed.addClass('has-error');                       
                    this.popup.ShowTip("限速必选大于0！");
                    return;
                }
            }

             if (start_date.val()=="") {
                start_date.addClass('has-error');                       
                this.popup.ShowTip("开始时间不能为空！");
                return;
            } 

             if (end_date.val()=="") {
                end_date.addClass('has-error');                       
                this.popup.ShowTip("结束时间不能为空！");
                return;
            } 

            var st=new Date(start_date.val()),et=new Date(end_date.val());
            if(et.getTime()-st.getTime()<0){
                this.popup.ShowTip("结束时间不能小于开始时间！");
                return;
            }  

            if(st.getTime()-(new Date(link_date.val()).getTime())>0){
                this.popup.ShowTip("执行时间不能小于开始时间！");
                return;
            }          
            $.ajax({
                    headers: this.getHeaders(1),
                    type: "POST",
                    url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + (this.editlabel=="edit"?this.config.updateRegionAlarm :this.config.addRegionAlarmInfo),
                    data: {
                        "id":id,
                        "district_name":district_name.val(),
                        "limit_speed": limit_speed.val(),
                        "area_graph": this.tempregionjson,
                        "region_type_id": region_type_id.val(),
                        "start_date": start_date.val(),
                        "end_date":end_date.val(),
                        "state":state.val(),
                        "executiong_mode_id":executiong_mode_id.val(),
                        "bindcarids":cars,
                        "excutedate":this.objpup.conObj.find('.link_date').val()
                    },
                    success: function(results){
                            var that = this;       
                            if (results.code != 1) {
                                this.popup.ShowTip(results.message);
                                return;
                            } else {
                                this.popup.Close();
                                that.toast.Show(this.config.messages[this.editlabel]);
                                this.keyword="";                                          
                                this.getWarnArea(); 
                            } 
                        }.bind(this),
                        dataType: "json"
                    });
            }.bind(this));
    }  
    
    /**
     * @funcation 获取报警区域信息列表
     */
    getWarnArea() {
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj);        
        this.initClear();
        this.domObj.find(".select_region_all_list").prop('checked',false);
        var typeid=this.domObj.find(".region_type_id").val();
        this.config.pagesize =parseInt(this.domObj.find(".dynamic_pagesize").val());
        $.ajax({
            headers:this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getRegionAlarmList,
            data: {
                "pageindex": this.config.currentpage,
                "pagesize":this.config.pagesize,
                "region_type_id":typeid,
                "keyword":this.keyword,
                "companyid":this.companyid
            },
            success: this.getWarnAreaListCallback.bind(this),
            error:function(data){
                this.loadWait.Hide();
                this.toast.Show(this.config.messages.other);
            }.bind(this),
            dataType: "json"
        });
    }
    getWarnAreaListCallback(results) { 
        console.log(results);      
        var that=this;
        if (results.code != 1) {
            this.loadWait.Hide();
            this.toast.Show(results.message);
            return;
        }

        if (results.result.total % this.config.pagesize == 0) {
            this.config.pagenumber = Math.floor(parseInt(results.result.total) / this.config.pagesize);
        } else {
            this.config.pagenumber = Math.floor(parseInt(results.result.total) / this.config.pagesize) + 1;
        }
        this.domObj.find(".pagecontrol").text("总共" + results.result.total + "条，每页");
        this.domObj.find(".content").text("第" + this.config.currentpage + "页共" + this.config.pagenumber + "页");
        this.domObj.find(".selectpagecontrol").text("，当前选中"+this.select_info.datas.length+"条");
        if (this.config.pagenumber == 0) {
            this.domObj.find(".pagecontrol").text("总共-条，每页-条");
            this.domObj.find(".content").text("第-页共-页");
            this.domObj.find(".selectpagecontrol").text("，当前选中-条");
        }
        //动态生成书签及分页控件
        var html_trs_data = "";
        $.each(results.result.rows, function (i, item) {
            var start_date=(item.start_date?Functions.DateFormat(new Date(item.start_date.replace(/-/g,"/")),"yyyy-MM-dd"):"");
            var end_date=(item.end_date?Functions.DateFormat(new Date(item.end_date.replace(/-/g,"/")),"yyyy-MM-dd"):"");
            var excutedate=(item.excutedate?Functions.DateFormat(new Date(item.excutedate.replace(/-/g,"/")),"yyyy-MM-dd"):"");
            var limit_speed=(item.limit_speed?item.limit_speed:"");
            html_trs_data += "<tr class=goto data-geometry='" + item.area_graph 
                            + "' data-id='" + item.id 
                            + "' data-district_name='" + item.district_name 
                            + "' data-start_date='" + start_date 
                            + "' data-end_date='" + end_date 
                            + "' data-editable='" + item.editable
                            + "' data-excutedate='" + excutedate 
                            + "' data-cars='" + item.cars 
                            + "' data-region_type_id='" + item.region_type_id 
                            + "' data-executiong_mode_id='" + item.executiong_mode_id 
                            + "' data-state='" + item.state 
                            + "' data-limit_speed='" + limit_speed 
                            + "'><td class='checkwidth'><input type='checkbox' class='select_region_list' data-geometry='" + item.area_graph 
                            + "' data-id='" + item.id 
                            + "' data-cars='" + item.cars
                            + "' data-district_name='" + item.district_name 
                            + "' data-start_date='" + start_date 
                            + "' data-end_date='" + end_date 
                            + "' data-excutedate='" + excutedate 
                            + "' data-region_type_id='" + item.region_type_id 
                            + "' data-executiong_mode_id='" + item.executiong_mode_id 
                            + "' data-state='" + item.state 
                            + "' data-editable='" + item.editable
                            + "' data-limit_speed='" + limit_speed
                            +"'/></td><td title='"+item.district_name+"'>" + item.district_name + "</td><td title='"+start_date+"'>" 
                            + start_date + "</td><td title='"+end_date+"'>" 
                            + end_date + "</td><td title='"+item.region_type+"'>" 
                            + item.region_type + "</td><td title='"+limit_speed+"'>"
                            + limit_speed + "</td><td title='"+item.executiong_mode+"'>"  
                            + item.executiong_mode + "</td><td title='"+excutedate+"'>" 
                            + excutedate + "</td><td title='"+item.cars+"'>" 
                            + item.cars + "</td><td title='"+item.valid+"'>"
                            + item.valid + "</td></tr>";            
        });
        this.domObj.find(".regionalarmlist").empty().append(html_trs_data);

        //勾选
        this.domObj.find('.select_region_list').off("change").on("change",function(e){  
            this.removeOrAddSelectItem(e.currentTarget.checked,$(e.currentTarget));
        }.bind(this));  
         //添加工单气泡         
        this.getAllWarnRegion();
    }

    /**
     * @function 获取所有报警区域图形
     */
    getAllWarnRegion() {
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getRegionAlarmList,
            data: {
                "pageindex": 1,
                "pagesize":  this.config.maxsize,
                "companyid":this.companyid              
            },
            success:function(results){
                this.loadWait.Hide();
                var that = this;
                if (results.code != 1) {
                    that.toast.Show(results.message);
                    return;
                }
                this.addPolygonGraphic(results);
            }.bind(this),
            error:function(data){
                this.loadWait.Hide();
                this.toast.Show(this.config.messages.other);
            }.bind(this),
            dataType: "json"
        });
    }    

    /**
     * @function 添加区域结果在地图上展示
     */
    addPolygonGraphic(queryResult) {
        this.warnAreaInfoGraphicLayer.clear();
        for (var i = 0, length = queryResult.result.rows.length; i < length; i++) {
            var row = queryResult.result.rows[i];
            if (row.area_graph == undefined || row.area_graph=="") { continue; }  
                      
            var polygon = new Polygon(JSON.parse(row.area_graph));
            var graphic = new Graphic(polygon, this.setSymbol(row.regionname)[2], "");

            graphic.attr("id", row.id);
            this.warnAreaInfoGraphicLayer.add(graphic);
            
            //添加文字
            var point = polygon.getExtent().getCenter();
            var peopleTextSymbol = new TextSymbol(row.district_name);
            peopleTextSymbol.setOffset(0, -25);
            var font = new Font();
            font.setSize("10pt");
            font.setWeight(Font.WEIGHT_BOLD);
            peopleTextSymbol.setFont(font);
            var graphicText = new Graphic(point, peopleTextSymbol, "");
            this.warnAreaInfoGraphicLayer.add(graphicText);
        }
    }  

    /**
     * @function 设置符号
     */
    setSymbol(txt?) {
        var symbol = [];
        var fillSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2), new Color([255, 0, 0, 0.5]));
        var lineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 2);
        var peopleSymbol = new PictureMarkerSymbol(this.config.MarkPictureSymbol, 48, 48);
        //根据字长度设置背景图片宽度
        var peopletextSymbol = new PictureMarkerSymbol(this.config.TextbgSymbol, txt == null ? 0 : txt.length * 90 / 6, 18);
        symbol.push(peopleSymbol);
        symbol.push(peopletextSymbol);
        symbol.push(fillSymbol);
        symbol.push(lineSymbol);
        return symbol;
    }

     /**
     * @function 添加或删除选中集合
     * @param ischecked 
     * @param currentTarget
     */
    removeOrAddSelectItem(ischecked,currentTarget){
        var item={ 
                "id": currentTarget.data('id'),
                "editable":currentTarget.data('editable')
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

    /**-------------------------字典信息------------------- */
    /**
     * @function 获取车辆列表
     * @param key
     * @param controlname
     */
    getCarList(){
        $.ajax({
                headers: this.getHeaders(0),
                type: "POST",                
                dataType: "json",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getVehicleList,
                data: {
                    "pageindex": 1,
                    "pagesize": this.config.maxsize,
                    "companyid":this.companyid
                },
                success: function (result) {
                    if (result.code != 1) {
                        this.toast.Show(result.message);
                        return;
                    }
                    var stroption = "";
                    var cars=(this.select_info.currentTarget!=null&&this.select_info.currentTarget.data("cars").indexOf(",")>-1?this.select_info.currentTarget.data("cars").split(","):[]);
                    result.result.rows.forEach(function (row) {
                        if(this.editlabel=="edit"){//编辑状态
                            var isselect=false;
                            for(var i=0;i<cars.length;i++){
                                if(cars[i]==row.plate_number){
                                     isselect=true;
                                     stroption+="<input checked type='checkbox' class='select_car_list' data-plate_number='"+row.plate_number+"'>"+row.plate_number;
                                     break;
                                }
                            }
                            if(isselect==false){
                                 stroption+="<input type='checkbox' class='select_car_list' data-plate_number='"+row.plate_number+"'>"+row.plate_number;
                            }                           
                        }else{
                            stroption+="<input type='checkbox' class='select_car_list' data-plate_number='"+row.plate_number+"'>"+row.plate_number;                           
                        }                        
                    }.bind(this));
                    this.objpup.conObj.find('.carlists').empty().append(stroption);
                }.bind(this),
                error: function (data) {
                    this.popup.ShowTip(this.config.messages.other);
                }.bind(this)
            });
    } 

     /**
     * @function 获取区域类型、执行方式
     * @param key
     * @param controlname
     * @param domObj
     * @param isall
     */
    getRegionType(key,controlname,domObj,isall){
        $.ajax({
                headers: this.getHeaders(0),
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
                        if(this.select_info.currentTarget!=null&&this.select_info.currentTarget.data(controlname)==row.id && this.editlabel=="edit"){//编辑状态
                            stroption += "<option selected='selected' value='" + row.id + "'>" + row.value + "</option>";
                        }else{
                            stroption += "<option value='" + row.id + "'>" + row.value + "</option>";
                        }                        
                    }.bind(this));
                    domObj.find('.'+controlname).empty().append(stroption);
                    if(controlname=="region_type_id"){
                        var selectObj=domObj.find('.region_type_id option:selected').text();
                        if(selectObj.indexOf('车速')>-1){
                            domObj.find('.limit_speed').prop('disabled',false);
                        }else{
                            domObj.find('.limit_speed').prop('disabled',true);
                        }
                        domObj.find('.region_type_id').off('change').on('change',function(){
                            var selectObj=this.objpup.conObj.find('.region_type_id option:selected').text();
                            this.objpup.conObj.find('.limit_speed').val("");
                            if(selectObj.indexOf('车速')>-1){
                                this.objpup.conObj.find('.limit_speed').prop('disabled',false);                                
                            }else{
                                this.objpup.conObj.find('.limit_speed').prop('disabled',true);
                            }
                        }.bind(this));
                    }
                }.bind(this),
                error: function (data) {
                    this.popup.ShowTip(this.config.messages.other);
                }.bind(this)
            });
    }    

    /**
     * @function 启用状态
     */
    getStartQy(){
        var optstr="";
        for(var i=0;i<this.config.isdicdata.length;i++){
            var row=this.config.isdicdata[i];
            if(this.select_info.currentTarget!=null&&this.select_info.currentTarget.data("state")==row.id && this.editlabel=="edit"){//编辑状态
                optstr += "<option selected='selected' value='" + row.id + "'>" + row.value + "</option>";
            }else{
                optstr += "<option value='" + row.id + "'>" + row.value + "</option>";
            } 
        }
        this.objpup.conObj.find('.state').empty().append(optstr);       
    }

    /**
     * @function 销毁对象
     */
    destroy() {
        this.initClear();
        //删除巡检片区
        if (this.warnAreaInfoGraphicLayer) {
            this.map.removeLayer(this.warnAreaInfoGraphicLayer);
            this.warnAreaInfoGraphicLayer.clear();
        }
        if (this.tempRegionGraphicLayer) {
            this.map.removeLayer(this.tempRegionGraphicLayer);
            this.tempRegionGraphicLayer.clear();
        }   
        this.domObj.remove();
        this.afterDestroy();
    }
}