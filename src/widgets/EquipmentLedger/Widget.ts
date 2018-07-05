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
import arrayUtils = require('dojo/_base/array');
import PopupTemplate = require('esri/dijit/PopupTemplate');
import SimpleMarkerSymbol = require('esri/symbols/SimpleMarkerSymbol');
import ClassBreaksRenderer = require('esri/renderers/ClassBreaksRenderer');
import InfoWindow = require('esri/dijit/InfoWindow');
import Popup = require('esri/dijit/Popup');
import domConstruct = require('dojo/dom-construct');
import ClusterLayer = require('extras/ClusterLayer');
import Save2File = require('./Save2File');
import Color = require("esri/Color");
import SimpleLineSymbol = require('esri/symbols/SimpleLineSymbol');
import SimpleFillSymbol = require('esri/symbols/SimpleFillSymbol');
import InfoTemplate = require('esri/InfoTemplate');
import Query = require('esri/tasks/query');
import QueryTask = require('esri/tasks/QueryTask');
import FeatureLayer = require('esri/layers/FeatureLayer');
import SimpleRenderer = require('esri/renderers/SimpleRenderer');
declare var Howl;
export = EquipmentLedger;
class EquipmentLedger extends BaseWidget {
    baseClass = "widget-equipmentledger";
    map = null;
    toast = null;
    photowall = null;
    loadWait=null;

    companycode = "";//公司id
    iszgs=false;//是否是总公司账号
    ispartment=false;

    deviceledger_layer:GraphicsLayer;//巡检设备图层
    curpage = null;//导出excel数据源 
    objectids = [];//所有ids
    objectids_layerid=[];//所有ids对应的图层顺序号  
    subObjIds={};//二次查询显示使用 
    subLayerIds="";//二次查询图层序号，以英文逗号分隔，分别对于subObjIds键值对
    currentPageFeatures=[];
    currentPageIds=[];

    /**
     * @function 启动初始化
     */
    startup() {
        this.configure();
        this.initHtml();        
        this.initEvent();        
    }

    /**
     * @function 配置初始化
     */
    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.photowall = this.AppX.runtimeConfig.photowall;
        this.loadWait=this.AppX.runtimeConfig.loadWait;
        this.map = this.AppX.runtimeConfig.map;
        if (!this.map.getLayer(this.config.layerids.deviceledger_layer)) {
            this.deviceledger_layer = new GraphicsLayer();
            this.deviceledger_layer.id=this.config.layerids.deviceledger_layer;
            this.map.addLayer(this.deviceledger_layer);
        }
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
     * @function 判断是否为集团账号
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
            this.domObj.find(".company_serch").show();
            this.getCompanyList();
            //部门列表
            this.domObj.find('.company').on("change", function () {  
                this.companycode=this.domObj.find(".company option:selected").val(); 
            }.bind(this));  
        }else{            
            this.domObj.find(".company_serch").hide(); 
            //this.getListEquipment();                   
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
                        //strdepartment += "<option selected value='" + item.code + "'>" + item.company_name + "</option>";
                    //}else{
                        strdepartment += "<option value='" + item.code + "'>" + item.company_name + "</option>";
                    //}   
                }.bind(this));
                this.domObj.find(".company").empty().append(strdepartment);
                this.companycode=(this.iszgs==true?this.domObj.find(".company option:selected").val():"");
                //this.getListEquipment();         
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    /**
     * @function 事件初始化
     */
    initEvent() {
        var that = this;
        this.initTypes();
        this.initRunstatus();
        this.initLoginUser();        
        
        //查询
        this.domObj.find('.btn-search').off("click").on("click", function () {
            this.getListEquipment();           
        }.bind(this));

        //导出
        this.domObj.find('.save2csv').off("click").on("click", function () {
            Save2File(this.curpage);            
        }.bind(this));

        //图层点击事件
        this.deviceledger_layer.on("click",function(gx){
            if(this.map.infoWindow!=null)
                this.map.infoWindow.hide();
            var popup = new Popup({
                                fillSymbol:new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                                           new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                                           new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]))
                            }, document.createElement("div"));

            popup.setMap(this.map);
            popup.setTitle("<div class='HiddenDangerSearch-id'>设备信息</div>");
            var info = _.template(that.template.split('$$')[3])(gx.graphic.attributes);
            popup.setContent(info);

            this.map.infoWindow = popup;                
            this.map.infoWindow.show(gx.graphic.geometry);
        }.bind(this));

        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');            
            if($(e.currentTarget).data("x") && $(e.currentTarget).data("y")){
                 if(this.map.infoWindow!=null)
                    this.map.infoWindow.hide();
                var mapPoint = new Point($(e.currentTarget).data("x"), $(e.currentTarget).data("y"), new SpatialReference({ wkid: this.map.spatialReference.wkid }));
                this.deviceledger_layer.clear();
                var gx=new Graphic(mapPoint, this.setGraphSymbol("point"));
                if(gx.attributes==undefined){
                    gx.attributes={
                         "district": $(e.currentTarget).data("district"),
                         "subtype": $(e.currentTarget).data("subtype"),
                         "addr": $(e.currentTarget).data("addr"),
                         "code": $(e.currentTarget).data("code"),
                         "status": $(e.currentTarget).data("status")
                    }
                }
                this.deviceledger_layer.add(gx);
                this.map.centerAndZoom(mapPoint, 17);              
               
                /*var popup = new Popup({
                                fillSymbol:new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                                           new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                                           new Color([255, 0, 0]), 2), new Color([255, 255, 0, 0.25]))
                            }, document.createElement("div"));

                popup.setMap(this.map);
                popup.setTitle("<div class='HiddenDangerSearch-id'>设备信息</div>");
                var info = _.template(that.template.split('$$')[3])({
                            "district": $(e.currentTarget).data("district"),
                            "subtype": $(e.currentTarget).data("subtype"),
                            "addr": $(e.currentTarget).data("addr"),
                            "code": $(e.currentTarget).data("code"),
                            "status": $(e.currentTarget).data("status")
                        });
                popup.setContent(info);

                this.map.infoWindow = popup;                
                //this.map.infoWindow.show(mapPoint);*/
            }            
        }); 
    }

    /**
     * @function 第二个页面初始化事件
     */
    initEvent2() {
        this.domObj.find('.btn-return').off("click").on("click", function () {
            this.domObj.empty().append(this.template.split('$$')[0] + "</div>");
            this.initTypes();
            this.initRunstatus();
            //this.getListEquipment();              
            this.initEvent();          
        }.bind(this));
    }

    /**
     * @function 获取设备信息
     */
    getListEquipment(){ 
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj); 

        this.domObj.find(".equipmentledgerlist").empty();
        this.deviceledger_layer.clear();
        this.config.pagetotal = 0;
        this.config.pagenumber = 0;
        this.config.currentpage = 1;
        this.objectids = [];
        this.objectids_layerid=[];
        this.subObjIds={};
        this.subLayerIds="";
        this.currentPageFeatures=[];
        this.currentPageIds=[];
        this.curpage=[];

        var tsop=this.domObj.find(".plantype option:selected").attr("layer_ids");
        var where=this.domObj.find(".plantype option:selected").attr("where");
        var runwhere=this.domObj.find(".planrun option:selected").attr("where");
        var runval=this.domObj.find(".planrun option:selected").val();
        var codewhere=this.domObj.find(".plantype option:selected").attr("managecode");
        var bm=this.domObj.find('.devicecode').val();
        var sidc=this.domObj.find(".devicesid").val();

        if(where==""){
            where="1=1";
        }else{
            where=where+"= '"+this.domObj.find(".plantype option:selected").val()+"'";
        }

        if(runval=="null"){
            where +=" and "+runwhere+" is null"
        }else if(runval!=""){
            where +=" and "+runwhere+" = '"+this.domObj.find(".planrun option:selected").val()+"'"
        }

        if(bm && bm!=""){
            where+=" and CODE like '%"+bm+"%'";
        }

        if(sidc && sidc!=""){
            where+=" and SID like '%"+sidc+"%'";
        }
        var codes=AppX.appConfig.range.replace(/;/g,',');
        if(this.iszgs==true){
            var selected_code=this.domObj.find(".company option:selected").val();
            if(selected_code!="")
                codes=selected_code;
        }
        if(codes!="")
            where+=' and '+codewhere+' in ('+codes+')';
        var layers=[];
        if(tsop.indexOf(',')>-1){
            layers=tsop.split(',');
        }else
            layers.push(tsop);
        
        this.queryEquipments(this.AppX.appConfig.gisResource.pipedata.config[this.config.mapindex].url,layers,0,where);
    }    
    
    /**
     * 查询设备信息ids
     * @param url 配置地址(string)
     * @param layerids 查询图层集合(array)
     * @param idx 当前查询图层索引号
     * @param where 条件
     */
    queryEquipments(url, layerids,idx, where) {
        if(idx==0){        
            this.objectids=[];
            this.objectids_layerid=[];
        }        
        if(idx==layerids.length){            
            return;
        }
        var queryTask = new QueryTask(url + "/" + layerids[idx]);
        var query = new Query();
        query.returnGeometry = false;        
        query.where = where;
        queryTask.executeForIds(query, function (results) {
            if(results!=null){
                for(var i=0;i<results.length;i++){
                    this.objectids.push(results[i]);
                    this.objectids_layerid.push(layerids[idx]);
                }
                this.config.pagetotal += results.length; 
            }
            
            idx=idx+1;

            if(idx==layerids.length){//查询完成
                if(this.config.pagetotal==0){//没有数据
                     this.domObj.find(".equipmentledgerlist").empty(); 
                     this.domObj.find(".pagecontrol").text("总共-条，每页");
                     this.domObj.find(".content").text("第-页共-页");
                     this.loadWait.Hide();
                     return;
                }else{
                    this.GetPage(this.objectids, this.config.currentpage); 
                }                
            }

            this.queryEquipments(url, layerids,idx, where);//递归查询         
        }.bind(this));
    }

    /**
     * @function 分页获取
     * @param results 所有ids
     * @param curpage 当前显示页
     */
    GetPage(results, curpage) {
        this.loadWait.Hide();
        this.loadWait.Show("正在查询数据，请耐心等待...",this.domObj); 
         if (this.config.pagetotal % this.config.pagesize == 0) {
            this.config.pagenumber = Math.floor(parseInt(this.config.pagetotal) / this.config.pagesize);
        }else{
            this.config.pagenumber = Math.floor(parseInt(this.config.pagetotal) / this.config.pagesize) + 1;
        }
        this.domObj.find(".content").text("第" + this.config.currentpage + "页共" + this.config.pagenumber + "页");

        var subobjectids = {};//分图层序号查询ids对象数组
        var layerids="";
        if (curpage <= this.config.pagenumber) {
            var startindex = (curpage - 1) * this.config.pagesize;
            var endindex = curpage * this.config.pagesize;
            for (var i = startindex; i < this.config.pagetotal && i < endindex; i++) {  
                var layerindex=""+this.objectids_layerid[i];             
                if(layerids.indexOf(layerindex)<0){
                    if(layerids!=""){
                        layerids+=",";
                    }
                    layerids+=layerindex;
                    subobjectids[layerindex]=[];
                }
                subobjectids[layerindex].push(results[i]);                 
            }
        }
        this.subObjIds=subobjectids;
        this.subLayerIds=layerids;       
        this.showListEquipments(this.subObjIds,this.subLayerIds,this.config.currentpage,0);
    }    

    /**
     * 查询页面curpage所有信息
     * @param subobjectids id集合{}
     * @param layerids 图层序号集合，以英文逗号","分割，并作为参数subobjectids的key值
     * @param curpage 显示页码
     * @param idx 查询序号
     */
    showListEquipments(subobjectids,layerids,currentpage,idx){  
        var layers=layerids.split(',');
        if(idx==0){
            this.currentPageFeatures=[];
            this.currentPageIds=[];
            this.curpage=[];
        }
        if(idx==layers.length){  
            this.loadWait.Hide();          
            return;
        }   
        var layerIndex=layers[idx];
        var outfields=this.config.layeroutfield[layerIndex]
        var subids=subobjectids[layerIndex];   
        var param = { "objectIds": subids.join(","), "returnGeometry": true, "outFields": outfields, "returnIdsOnly": false, "f": "json" };

        $.ajax({
            type: "POST",
            url: this.AppX.appConfig.gisResource.pipedata.config[this.config.mapindex].url + "/" + layerIndex + "/query",
            cache: false,
            data: param,
            dataType: "json",
            success: function (response) {
                if (response.error !== undefined) {
                    this.AppX.runtimeConfig.toast.Show("查询失败，请联系管理员");                   
                }
                response.features.forEach((p, itemindx) => { 
                    var itemobj={
                        index:layerIndex,
                        feature:p
                    }   
                    this.currentPageFeatures.push(itemobj);
                    this.currentPageIds.push(this.config.layernamedic[layerIndex] + "-" + p.attributes.SID);
                    
                });
                
                if(idx==(layers.length-1)){//显示结果                
                    $.ajax({
                            headers: this.getHeaders(0),
                            type: "POST",                       
                            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getRecordStates,
                            data: {
                                list:this.currentPageIds
                            },
                            success: function(results){//查询是否有记录id,state
                                    
                                    var html_trs_data = "";
                                    this.currentPageFeatures.forEach((p, itemindx) => {  
                                        var isrecord=false
                                        var pid=this.config.layernamedic[p.index]+ "-" + p.feature.attributes.SID;
                                        var jx_item=null;
                                        if(results.code==1 && results.result!=null){
                                            for(var k=0;k<results.result.length;k++){
                                                var ritem=results.result[k];
                                                if(ritem.id==pid && ritem.state==1){
                                                    isrecord=true;                                                    
                                                    jx_item=ritem;
                                                    break;
                                                }
                                            }
                                        }
                                        if(isrecord==true){
                                            p.feature.attributes['nearest_repairedate']=(jx_item.nearest_repairedate!=null?jx_item.nearest_repairedate:"");
                                        }else{
                                            p.feature.attributes['nearest_repairedate']="";
                                        }
                                        this.curpage.push(p.feature);
                                        var addr="";
                                        if(p.feature.attributes.ADDR){
                                            addr=p.feature.attributes.ADDR;
                                        }else
                                            if(p.feature.attributes.LOCATION){
                                                addr=p.feature.attributes.LOCATION;
                                            }
                                        if(p.feature.attributes.SUBTYPE==10000){
                                            p.feature.attributes.SUBTYPE='阀室';
                                        }
                                        if(isrecord==true){
                                            console.log(jx_item);
                                            html_trs_data += "<tr class=goto data-sid='" + this.config.layernamedic[p.index] + "-" + p.feature.attributes.SID 
                                                        + "' data-objectid='" + this.config.layernamedic[p.index] + "-" + p.feature.attributes.OBJECTID 
                                                        + "' data-x='" + p.feature.geometry.x 
                                                        + "' data-y='" + p.feature.geometry.y 
                                                        + "' data-district='" + p.feature.attributes.DISTRICT_XZQ 
                                                        + "' data-subtype='" + p.feature.attributes.SUBTYPE 
                                                        + "' data-code='" + p.feature.attributes.CODE 
                                                        + "' data-status='" + p.feature.attributes.STATUS 
                                                        + "' data-addr='" + addr
                                                        + "'><td title='"+p.feature.attributes.SID+"' class='centercheck'>" + p.feature.attributes.SID
                                                        + "</td><td title='"+(p.feature.attributes.CODE?p.feature.attributes.CODE:"")+"' class='centercheck'>" + (p.feature.attributes.CODE?p.feature.attributes.CODE:"")
                                                        + "</td><td title='"+p.feature.attributes.SUBTYPE+"' class='centercheck'>" + p.feature.attributes.SUBTYPE 
                                                        + "</td><td title='"+p.feature.attributes.DISTRICT_XZQ+"' class='centercheck'>" + p.feature.attributes.DISTRICT_XZQ 
                                                        + "</td><td title='"+p.feature.attributes.STATUS+"' class='centercheck'>" + p.feature.attributes.STATUS 
                                                        + "</td><td title='"+addr+"'>" + addr
                                                        + "</td><td title='"+(jx_item.nearest_repairedate!=null?jx_item.nearest_repairedate:"")+"'>" + (jx_item.nearest_repairedate!=null?jx_item.nearest_repairedate:"") 
                                                       
                                                        + "</td><td class='centercheck'><a class='operation' data-pointid='" + this.config.layernamedic[p.index] + "-" + p.feature.attributes.SID + "'>检查记录</a></td></tr>";

                                        }else{
                                            html_trs_data += "<tr class=goto data-sid='" + this.config.layernamedic[p.index] + "-" + p.feature.attributes.SID 
                                                        + "' data-objectid='" + this.config.layernamedic[p.index] + "-" + p.feature.attributes.OBJECTID 
                                                        + "' data-x='" + p.feature.geometry.x 
                                                        + "'  data-y='" + p.feature.geometry.y 
                                                        + "'  data-district='" + p.feature.attributes.DISTRICT_XZQ 
                                                        + "' data-subtype='" + p.feature.attributes.SUBTYPE 
                                                        + "' data-code='" + p.feature.attributes.CODE 
                                                        + "' data-status='" + p.feature.attributes.STATUS 
                                                        + "' data-addr='" + addr
                                                        + "'><td title='"+p.feature.attributes.SID+"' class='centercheck'>" + p.feature.attributes.SID
                                                        + "</td><td title='"+(p.feature.attributes.CODE?p.feature.attributes.CODE:"")+"' class='centercheck'>" + (p.feature.attributes.CODE?p.feature.attributes.CODE:"")
                                                        + "</td><td title='"+p.feature.attributes.SUBTYPE+"' class='centercheck'>" + p.feature.attributes.SUBTYPE 
                                                        + "</td><td title='"+p.feature.attributes.DISTRICT_XZQ+"' class='centercheck'>" + p.feature.attributes.DISTRICT_XZQ 
                                                        + "</td><td title='"+p.feature.attributes.STATUS+"' class='centercheck'>" + p.feature.attributes.STATUS 
                                                        + "</td><td title='"+addr+"'>" + addr 
                                                        + "</td><td>"
                                                        + "</td><td class='centercheck'>无</td></tr>";
                                        }
                                    });
                                    this.domObj.find(".equipmentledgerlist").empty().append(html_trs_data);
                                    var domtb_page = this.domObj.find(".pagecontrol");

                                    domtb_page.text("总共" + this.config.pagetotal + "条，每页");
                                    this.domObj.find(".content").text("第" + this.config.currentpage + "页共" + this.config.pagenumber + "页");
                                    if (this.config.pagetotal == 0) {
                                        this.domObj.find(".pagecontrol").text("总共-条，每页");
                                        this.domObj.find(".content").text("第-页共-页");
                                    }
                                    var that = this;
                                
                                    //定义检查记录事件
                                    this.domObj.find(".operation").off("click").on("click", function (e) {
                                        that.map.infoWindow.hide();
                                        var id=$(this).data("pointid");
                                        $.ajax({
                                            headers:this.getHeaders(0),
                                            type: "POST",
                                            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + that.config.getPlanPointRepair+id,
                                            data: {                            
                                                "point_id":id
                                            },
                                            success: that.getPlanPointRepairCallback.bind(that),
                                            error: function (data) {
                                                that.toast.Show("服务端ajax出错，获取数据失败!");
                                            }.bind(that),
                                            dataType: "json",
                                        });
                                        e.stopPropagation();
                                    });

                                    //上一页
                                    this.domObj.find(".pre").off("click").on("click", function () {
                                        if (this.config.currentpage - 1 > 0) {                       
                                            this.config.currentpage = this.config.currentpage - 1;
                                            this.GetPage(this.objectids, this.config.currentpage);
                                        }
                                    }.bind(this));

                                    //下一页
                                    this.domObj.find(".next").off("click").on("click", function () {
                                        if (this.config.currentpage + 1 <= this.config.pagenumber) {
                                            this.config.currentpage = this.config.currentpage + 1;
                                            this.GetPage(this.objectids, this.config.currentpage);
                                        }
                                    }.bind(this));

                                    //默认页条数修改
                                    this.domObj.find(".dynamic_pagesize").off("change").on("change", function () {
                                        this.config.pagesize= parseInt(this.domObj.find(".dynamic_pagesize option:selected").val());                                        
                                        this.GetPage(this.objectids, this.config.currentpage);           
                                    }.bind(this));

                                    //跳转
                                    this.domObj.find(".pageturning").off("click").on("click", function () {
                                        var currpage = parseInt(this.domObj.find(".currpage").val());
                                        if (currpage <= this.config.pagenumber && currpage >= 1) {                        
                                            this.config.currentpage = parseInt(this.domObj.find(".currpage").val());
                                            this.GetPage(this.objectids, this.config.currentpage);
                                        }
                                    }.bind(this));
                                    this.loadWait.Hide();
                                    return;

                            }.bind(this),
                            error: function (data) {
                                this.loadWait.Hide();
                                this.toast.Show("服务端ajax出错，获取数据失败!");
                            }.bind(this),
                            dataType: "json",
                        });
                }

                this.showListEquipments(this.subObjIds,this.subLayerIds,this.config.currentpage,idx+1);//递归显示查询               
            }.bind(this)
        });
    }

    //查看检修记录结果
    getPlanPointRepairCallback(results) {
        var that = this;
        console.log(results);
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.domObj.empty().append(this.template.split('$$')[1]);      
        this.initEvent2();
        var html_trs_data = "";
        $.each(results.result.rows, function (i, item) {
            var pic = [];
            var ip=AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3);
            if (item.jianlouqian != "") {
                if (item.jianlouqian.indexOf(",") > 0) {
                    var jlq=item.jianlouqian.split(",");
                    for (var k = 0; k < jlq.length; k++) {
                        pic.push({ "src": ip+jlq[k], "alt": this.config.picdic["jianlouqian"] });
                    }

                } else {
                    pic.push({ "src": ip + item.jianlouqian, "alt": this.config.picdic["jianlouqian"] });
                }
            }

            if (item.jianlouhou != "") {
                if (item.jianlouhou.indexOf(",") > 0) {
                    var jlh=item.jianlouhou.split(",");
                    for (var k = 0; k < jlh.length; k++) {
                        pic.push({ "src": ip+jlh[k], "alt": this.config.picdic["qinglouhou"] });
                    }

                } else {
                    pic.push({ "src": ip+ + item.jianlouhou, "alt": this.config.picdic["qinglouhou"] });
                }
            }

            if (item.qingxiqian != "") {
                if (item.qingxiqian.indexOf(",") > 0) {
                    var qxq=item.qingxiqian.split(",");
                    for (var k = 0; k < qxq.length; k++) {
                        pic.push({ "src": ip+qxq[k], "alt": this.config.picdic["qingxiqian"] });
                    }
                } else {
                    pic.push({ "src":ip + item.qingxiqian, "alt": this.config.picdic["qingxiqian"] });
                }
            }

            if (item.qingxihou != "") {
                if (item.qingxihou.indexOf(",") > 0) {
                    var qxh=item.qingxihou.split(",");
                    for (var k = 0; k < qxh.length; k++) {
                        pic.push({ "src": ip+qxh[k], "alt": this.config.picdic["qingxihou"] });
                    }

                } else {
                    pic.push({ "src": ip + item.qingxihou, "alt": this.config.picdic["qingxihou"] });
                }
            }

            if (item.guanbiyali != "") {
                if (item.guanbiyali.indexOf(",") > 0) {
                    var gbyl=item.guanbiyali.split(",");
                    for (var k = 0; k < gbyl.length; k++) {
                        pic.push({ "src": ip+gbyl[k] , "alt": this.config.picdic["guanbiyali"] });
                    }

                } else {
                    pic.push({ "src": ip + item.guanbiyali, "alt": this.config.picdic["guanbiyali"] });
                }
            }

            if (item.yunxingyali != "") {
                if (item.yunxingyali.indexOf(",") > 0) {
                    var yxyl=item.yunxingyali.split(",");
                    for (var k = 0; k < yxyl.length; k++) {
                        pic.push({ "src": ip+yxyl[k] , "alt": this.config.picdic["yunxingyali"]});
                    }

                } else {
                    pic.push({ "src": ip + item.yunxingyali, "alt": this.config.picdic["yunxingyali"] });
                }
            }

            if (item.qieduanyali != "") {
                if (item.qieduanyali.indexOf(",") > 0) {
                    var qdyl=item.qieduanyali.split(",");
                    for (var k = 0; k < qdyl.length; k++) {
                        pic.push({ "src": ip+qdyl[k], "alt": this.config.picdic["qieduanyali"] });
                    }

                } else {
                    pic.push({ "src": ip + item.qieduanyali, "alt": this.config.picdic["qieduanyali"] });
                }
            }

            html_trs_data += "<tr class='goto'><td title='"+item.user+"'>" + item.user 
            + "</td><td title='"+item.create_time+"'>" + item.create_time            
            + "</td><td title='"+item.leak_detect+"'>" + item.leak_detect 
            + "</td><td title='"+item.operating_pressure+"'>" + item.operating_pressure 
            + "</td><td title='"+item.closing_pressure+"'>" + item.closing_pressure 
            + "</td><td title='"+item.cutting_pressure+"'>" + item.cutting_pressure 
            + "</td><td title='"+item.switch_flexible+"'>" + item.switch_flexible 
            + "</td><td title='"+item.notes+"'>" + item.notes 
            + "</td><td><a class='view_pic' data-pic='" + JSON.stringify(pic) + "'>照片</a></td></tr>";
            
        }.bind(this));        
        this.domObj.find(".adddevicerepair").empty().append(html_trs_data);

        this.domObj.find('.view_pic').off("click").on("click", (e) => {
            var pics = $(e.currentTarget).data("pic"); 
            var htmlstr="";
            for(var i=0;i<pics.length;i++){
               if(pics[i].alt ==undefined){
                   htmlstr+="<li style='margin-top:5px;'><img src='"+pics[i].src+"'/></li>"
               }else{
                    htmlstr+="<li style='margin-top:5px;'><img src='"+pics[i].src+"' alt='"+pics[i].alt+"'/></li>";
               }               
            }
            this.photowall.setSize(600, 650);
            var Obj=this.photowall.Show("检修照片查看", this.template.split('$$')[4])
            Obj.conObj.find('.piclist').empty().append(htmlstr);
            Obj.conObj.find('.piclist').off("click").on("click",function(){
                $('.piclist').viewer();
                return false;
            }.bind(this))          
            //this.photowall.setSize(600, 650);
            //var htmlString = _.template(this.template.split('$$')[2])({ photoData: pics });
            //var Obj = this.photowall.Show("照片", htmlString);
        });
    }

    //设置点、线或多边形的样式
    setGraphSymbol(type) {
        var symbol = {
            "SimpleMarkerSymbol": null,
            "SimpleLineSymbol": null,
            "SimpleFillSymbol": null,
        };
        switch (type) {
            case "point":
                symbol.SimpleMarkerSymbol = new SimpleMarkerSymbol(
                    {
                        color: new Color(this.config.color),
                        style: "diamond",       //点样式solid\cross\square|diamond|circle|x
                        outline: {
                            color: new Color(this.config.color),
                            width: 0.2
                        }
                    }
                );
                break;
            case "polyline":
                symbol.SimpleLineSymbol = new SimpleLineSymbol({
                    color: new Color(this.config.color),
                    style: "solid",   //线的样式 dash|dash-dot|solid等	
                    width: 3
                });
                break;

            case "polygon":
                symbol.SimpleFillSymbol = new SimpleFillSymbol({
                    color: new Color([0, 0, 0, 0.1]),
                    style: "solid",
                    outline: {
                        color: new Color(this.config.color),
                        width: 1

                    }
                });
                break;
        }
        if (symbol.SimpleMarkerSymbol != null) {
            return symbol.SimpleMarkerSymbol;
        } else if (symbol.SimpleLineSymbol != null) {
            return symbol.SimpleLineSymbol;
        } else {
            return symbol.SimpleFillSymbol;
        }
    }

    /**--------------------------字典----------------------------- */
    /**
     * @function 初始化设备类型列表
     */
    initTypes(){
        var types=this.config.device_type_id; 
        var optionHtml="";      
        for(var i=0;i<types.length;i++){
            var tp=types[i];
            optionHtml+="<option managecode='"+tp.managecode+"' where='"+tp.where+"' value='"+tp.value+"' layer_ids='"+tp.layer+"' layer_names='"+tp.layername+"'>"+tp.name+"</option>"
        }
        this.domObj.find(".plantype").empty().append(optionHtml);
        this.domObj.find(".plantype option:first").prop("selected", 'selected');
    }

    /**
     * @function 初始化设施状态
     */
    initRunstatus(){
        var runstatus=this.config.runstatus; 
        var optionHtml="";      
        for(var i=0;i<runstatus.length;i++){
            var tp=runstatus[i];
            optionHtml+="<option where='"+tp.where+"' value='"+tp.value+"'>"+tp.name+"</option>"
        }
        this.domObj.find(".planrun").empty().append(optionHtml);
        this.domObj.find(".plantype option:first").prop("selected", 'selected');
    }

    /**
     * @function 销毁对象
     */
    destroy() {
        this.map.infoWindow.hide();
        if (this.deviceledger_layer) {            
            this.deviceledger_layer.clear();
            this.map.removeLayer(this.deviceledger_layer);
        }
        this.domObj.remove();
        this.afterDestroy();
    }
}