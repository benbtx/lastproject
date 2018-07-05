import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');
/** 本地模块 */
import Data2Table = require('./Data2Table');
import Save2File = require('./Save2File');
import Locate = require('./Locate');

export = DataPanelLoader;

interface Data {
    tabs: Array<DataTabs>
}
interface TabQuery {//记录tab的数据查询条件,用于再次排序
    where: string,
    geometry: any,
}
interface DataTabs {
    title: string,
    id: string,
    canLocate: false,
    objectIDIndex: number,
    layerId: number,//
    layerurl: string,//
    filter: any,//请求条件,多用于非gis数据的后端分页
    url: string,//
    query: TabQuery,
    order: string,//排序条件，例如：STATE_NAME asc
    objectids: Array<number>,//全体数据的objectid集合
    outFields: Array<string>,//输出字段名
    outAlias: Array<string>,//输出字段别名
    currentobjectids: string,//记录当前页的objectids
    objectidVisible: boolean,//标记objectid字段是否可见
    draw: number,//请求序号
    table: {
        theadnames: Array<string>,//字段英文名
        thead: Array<string>,
        tbody: Array<Array<string | number>>
    }
}

/**
* Description: 用于将 DataPanelControler 初始化并放置在 AppX中
* @class DataPanelLoader
*/
class DataPanelLoader extends BaseWidget {
    constructor(settings) {
        super(settings)

        this.AppX.runtimeConfig.dataPanel = new DataPanel(settings);
        this.ready();
    }

    // 定义销毁函数
    destroy() {
    }
}

// 数据面板类
class DataPanel extends BaseWidget {
    baseClass: string = "widget-datapanel";
    /** 常量 */
    headerHeight: number = 33;
    tableBodyHeighDelta: number = 36;
    idPrefix: string = 'datapanel-';
    /** 状态变量 */
    isDestroyed: boolean = false;
    /** 暂存Dom */
    dataTable: DataTables.DataTable = null;
    tabHeader: JQuery;
    dataTablesScrollBody: JQuery;
    navTabs: JQuery;
    tabContent: JQuery;
    headbar: JQuery;
    /** 暂存变量 */
    data: Data = null;
    toast = null;

    // 启动函数
    startup() {
        this.setHtml(this.template);

        this.configure();
        this.bindEvents();
    }

    // 进行一些简单的配置
    configure() {
        this.toast = this.AppX.runtimeConfig.toast;

        this.tabHeader = this.domObj.find('.tab-header');
        this.dataTablesScrollBody = this.domObj.find('.dataTables_scrollBody');
        this.navTabs = this.domObj.find('.nav-tabs');
        this.tabContent = this.domObj.find('.tab-content');
        this.headbar = this.domObj.find('.headbar');
    }

    // 绑定事件
    bindEvents() {
        // 标签切换
        this.domObj.on('shown.bs.tab', 'a[data-toggle="tab"]', () => {
            this.adjustTableColumns();
        });

        // 标签可拖动
        this.domObj.find('.nav-tabs').sortable({
            axis: "x",
            containment: "parent"
        });

        // 面板高度可调整
        this.domObj.draggable({
            handle: ".resize-bar",
            axis: "y",
            opacity: 0.35,
            containment: [0, 60, 0, $(window).height() - 79],
            stop: () => {
                this.refitTableHeight();
            }
        });

        // 窗口大小调整函数
        $(window).on('resize.datapanel', () => {
            this.refitTableHeight();
        });

        // 选中行高亮
        this.domObj.on('click', 'tbody tr', (e) => {
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');
        });

        // 双击定位
        this.domObj.on('dblclick', 'tbody tr', (e) => {
            e.stopPropagation();
            var index = this.getActiveTabIndex();
            if (this.data.tabs[index].canLocate) {
                var row: any = e.currentTarget;
                var rowIndex: any = row.rowIndex;
                var objectID = null;
                if (this.data.tabs[index].currentobjectids && this.data.tabs[index].currentobjectids.length > 0)
                    objectID = this.data.tabs[index].currentobjectids.split(',')[rowIndex - 1];//从当前页的objectids集合内读取该行的objectid，
                else if (this.data.tabs[index].objectIDIndex != null) {
                    objectID = +$(e.currentTarget).children('td').eq(this.data.tabs[index].objectIDIndex).html();
                }
                if (objectID == null) {
                    this.toast.Show('地图展示失败!');
                    return;
                }
                if (this.data.tabs[index].url != null)
                    Locate.Show(objectID,
                        Functions.concatUrl(this.data.tabs[index].url,
                            "" + this.data.tabs[index].layerId
                        )
                    );
                // 接入定位模块

            } else {
                this.toast.Show('该记录不支持地图展示');
            }
        });

        // 关闭面板
        this.domObj.on('click', '.close-panel', () => {
            this.Close();
        });

        // 展开面板
        this.domObj.on('click', '.unfold-panel', () => {
            this.Unfold();
        });

        // 折叠面板 
        this.domObj.on('click', '.fold-panel', () => {
            this.Fold();
        });

        // 保存 
        this.domObj.on('click', '.save2csv', () => {
            this.saveFile();
        });
    }

    // 重新调整表格列宽
    adjustTableColumns() {
        $.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
    }

    // 重新调整表格高度
    refitTableHeight() {
        var widgetHeaderHeight = this.headerHeight + this.headbar.height() +
            this.tableBodyHeighDelta;
        this.domObj.find('.dataTables_scrollBody').height(
            this.domObj.height() - widgetHeaderHeight + 'px'
        );
    }

    saveFile() {
        var currenttab = this.data.tabs[this.getActiveTabIndex()];
        if (currenttab.objectids != null && currenttab.objectids.length > 0) {
            //以服务端方式导出数据
            this.exportDataOnServer(currenttab);
        }
        else
            Save2File(currenttab);
    }

    getActiveTabIndex() {
        return this.navTabs.find('li.active')
            .data('index')
            .toString()
            .trim();
    }

    // 折叠面板
    fold() {
        this.Fold();
    }
    public Fold() {
        var top = this.domObj.parent().height() - this.headerHeight;
        this.domObj.css({ top: top + "px" });
        this.refitTableHeight();
        Locate.Clean();
    }

    // 最大化面板
    unfold() {
        this.Unfold();
    }
    public Unfold() {
        this.domObj.css({ top: "0" });
        this.refitTableHeight();
        Locate.Clean();
    }

    // 废弃的命名方法，此处做兼容
    close() {
        this.Close();
    }
    // 关闭面板
    public Close() {
        this.domObj.hide();
        Locate.Clean();
    }

    // 废弃的命名方法，此处做兼容
    show(data) {
        this.Show(data);
    }
    // 展示数据面板方法
    public Show(sourceData: any) {
        var data = Data2Table(sourceData);
        if (!data) {
            this.toast.Show('数据错误！');
            return;
        }

        this.cleanAllData();
        this.data = data;
        this.initTabs();
        this.domObj.show();
        this.initTable(false);
        this.refitTableHeight();
    }

    // 初始化tab
    initTabs() {
        var tabsStr = '';
        var tabContentStr = '';
        for (var i = 0, j = this.data.tabs.length; i < j; i++) {
            var currentTab = this.data.tabs[i];
            tabsStr += '<li role="presentation" ' +
                'data-index="' + i + '" ' +
                (i === 0 ? 'class="active" ' : '') + '>' +
                '<a ' +
                'href="#' + this.idPrefix + currentTab.id + '" ' +
                // 'href="#' + this.idPrefix + currentTab.id + '" ' +
                'data-toggle="tab" ' +
                'data-canlocate="' + currentTab.canLocate + '" ' +
                'data-layerid="' + currentTab.layerId + '">' +
                currentTab.title +
                '</a>' +
                '</li>';
            tabContentStr += '<div role="tabpanel" class="tab-pane' +
                (i === 0 ? ' active' : '') + '" ' +
                'id="' + this.idPrefix + currentTab.id + '">' +
                '<table class="table table-striped table-condensed ' +
                'table-hover table-bordered nowrap" cellspacing= "0" ' +
                'width= "100%" ></table>' +
                '</div>';
        }
        this.navTabs.html(tabsStr);
        this.tabContent.html(tabContentStr);
    }

    // // 初始化Table
    // initTable() {
    //     for (var i = 0, j = this.data.tabs.length; i < j; i++) {
    //         var currentTab = this.data.tabs[i];
    //         var selector = '#' + this.idPrefix + currentTab.id + ' table';
    //         this.createTable(this.domObj.find(selector), currentTab);
    //     }
    // }

    // 清除现有所有数据
    cleanAllData() {
        this.navTabs.html('');
        this.tabContent.html('');
    }
    /**
    * (方法说明)构建不使用后台分页的表格
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明) 
    */
    createTable(tableObj: JQuery, dataTab: DataTabs) {
        // 初始化表格
        tableObj.DataTable({
            columns: dataTab.table.thead.map(item => { return { title: item } }),
            data: dataTab.table.tbody,
            dom: 't' +
            '     <"row"' +
            '           <"col-xs-3 information"ri>' +
            '           <"col-xs-1 length-changing"l>' +
            '           <"col-xs-4 col-sm-6 col-md-8 pull-right pagination"p>' +
            '     >',
            language: {
                "lengthMenu": "每页 _MENU_ 条",
                "zeroRecords": "未查询到任何记录",
                "info": "共 _TOTAL_ 条记录，当前 _START_ - _END_ ",
                "infoEmpty": "没有符合条件的记录",
                "infoFiltered": "(从总共 _MAX_ 条数据中找到)",
                "paginate": {
                    "first": "首页",
                    "last": "尾页",
                    "next": "下一页",
                    "previous": "上一页"
                },
                "search": "搜索: ",
            },
            pagingType: "simple_numbers",
            scrollY: "200",
            scrollCollapse: false,
            scrollX: true
        });
    }
    /**
    * (方法说明)构建基于服务端的分页的表格
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    createServersideTable(tableObj: JQuery, dataTab: DataTabs) {
        var url = dataTab.url;
        // 初始化表格
        tableObj.DataTable({
            columns: dataTab.table.thead.map(item => { return { title: item } }),
            data: dataTab.table.tbody,
            dom: 't' +
            '     <"row"' +
            '           <"col-xs-3 information"ri>' +
            '           <"col-xs-1 length-changing"l>' +
            '           <"col-xs-4 col-sm-6 col-md-8 pull-right pagination"p>' +
            '     >',
            language: {
                "lengthMenu": "每页 _MENU_ 条",
                "zeroRecords": "未查询到任何记录",
                "info": "共 _TOTAL_ 条记录，当前 _START_ - _END_ ",
                "infoEmpty": "没有符合条件的记录",
                "infoFiltered": "(从总共 _MAX_ 条数据中找到)",
                "paginate": {
                    "first": "首页",
                    "last": "尾页",
                    "next": "下一页",
                    "previous": "上一页"
                },
                "search": "搜索: ",
            },
            pagingType: "simple_numbers",
            scrollY: "200",
            scrollCollapse: false,
            scrollX: true,
            serverSide: true,
            ajax: function (data: any, callback, setting) {
                this.AppX.runtimeConfig.loadMask.Show("正在执行中，请耐心等待...");
                var pagesize = data.length;
                var pageindex = data.start / pagesize + 1;
                var param: any = {};
                param.returnGeometry = false;
                param.outFields = "*";
                if (dataTab.outFields)
                    param.outFields = dataTab.outFields.join(',');
                if (!dataTab.objectidVisible) {
                    param.outFields = "OBJECTID," + param.outFields;//手动添加objectid字段，用于排序。
                }
                param.returnIdsOnly = false;
                param.f = "json";
                var queryurl = url + "/" + dataTab.layerId + "/query";
                if (data.order.length > 0 && dataTab.draw > 1) {//第一次不排序，第一次排序会有卡顿现象
                    var ordercolumnindex = data.order[0].column;
                    var ordertype = data.order[0].dir;
                    param.orderByFields = dataTab.table.theadnames[ordercolumnindex] + " " + ordertype;
                    if (param.orderByFields != dataTab.order) {
                        this.updateOIDs(queryurl, param, dataTab, callback, pageindex, pagesize);//使用异步请求更新oids
                    }
                    else {
                        var objectids = this.getCurrentPageOIDs(dataTab.objectids, pageindex, pagesize);
                        param.objectIds = objectids.join(",");
                        //orderByFields=STATE_NAME ASC, RACE DESC, GENDER
                        this.queryCurrenPageData(queryurl, param, dataTab, callback);
                    }
                }
                else {
                    var objectids = this.getCurrentPageOIDs(dataTab.objectids, pageindex, pagesize);
                    param.objectIds = objectids.join(",");
                    //orderByFields=STATE_NAME ASC, RACE DESC, GENDER
                    this.queryCurrenPageData(queryurl, param, dataTab, callback);
                }
            }.bind(this)
        });
    }
    /**
    * (方法说明)以后台分页方式显示表格
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    showPage(sourceData) {
        this.ShowPage(sourceData);
    }
    /**
    * (方法说明)以后台分页方式显示表格
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    ShowPage(sourceData) {
        var data = Data2Table(sourceData);
        if (!data) {
            this.toast.Show('数据错误！');
            return;
        }

        this.cleanAllData();
        this.data = data;
        this.initTabs();
        this.domObj.show();
        this.initTable(true);
        this.refitTableHeight();
    }
    /**
    * (方法说明)更新oids集合，考虑字段排序
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    updateOIDs(queryurl, queryparam, dataTab, callback, pageindex, pagesize) {
        if (dataTab.query.where == null && dataTab.query.geometry == null) {//网络分析类数据不能进行排序
            var objectids = this.getCurrentPageOIDs(dataTab.objectids, pageindex, pagesize);
            queryparam.objectIds = objectids.join(",");
            this.queryCurrenPageData(queryurl, queryparam, dataTab, callback);
            return;
        }
        dataTab.order = queryparam.orderByFields;
        var param: any = {};
        //param.objectIds = dataTab.objectids.join(",");
        if (dataTab.query.where != null) {
            param.where = dataTab.query.where;
        }
        if (dataTab.query.geometry != null) {
            param.geometry = JSON.stringify(dataTab.query.geometry.toJson());
            param.geometryType = this.getGeoType(dataTab.query.geometry.type);//esriGeometryPolygon";//dataTab.query.geometry.type;
            param.spatialRel = "esriSpatialRelIntersects";
            param.inSR = 4490;
            param.outSR = 4490;
        }
        param.returnIdsOnly = true;
        param.orderByFields = queryparam.orderByFields;
        param.f = "json";
        $.ajax({
            type: "POST",
            url: queryurl,
            cache: false,  //禁用缓存
            data: param,  //传入组装的参数
            dataType: "json",
            // async: false,
            success: function (response) {
                dataTab.objectids = response.objectIds;
                this.AppX.runtimeConfig.loadMask.Hide();
                var objectids = this.getCurrentPageOIDs(dataTab.objectids, pageindex, pagesize);
                queryparam.objectIds = objectids.join(",");
                this.queryCurrenPageData(queryurl, queryparam, dataTab, callback);
            }.bind(this),
            error: function (data) {
                this.AppX.runtimeConfig.loadMask.Hide();
                this.AppX.runtimeConfig.toast.Show("操作失败，请联系管理员");
                console.error(data);
            }.bind(this)
        });
    }
    private getGeoType(type): string {
        var geoType = "esriGeometryEnvelope";
        switch (type) {
            case 'point':
                geoType = "esriGeometryPoint";
                break;
            case 'polyline':
                geoType = "esriGeometryPolyline";
                break;
            case 'polygon':
                geoType = "esriGeometryPolygon";
                break;
            case 'multipoint':
                geoType = "esriGeometryMultipoint";
                break;
            default:
                geoType = "esriGeometryEnvelope";
        }
        return geoType;
    }
    /**
    * (方法说明)后台分页时，查询第一页的数据
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    queryFirstPageData(tableObj: JQuery, dataTab: DataTabs) {
        var objectids = this.getCurrentPageOIDs(dataTab.objectids, 1, 10);
        var param: any = {};
        param.objectIds = objectids.join(",");
        param.returnGeometry = false;
        param.outFields = "*";
        if (dataTab.outFields)
            param.outFields = dataTab.outFields.join(',');
        if (!dataTab.objectidVisible) {
            param.outFields = "OBJECTID," + param.outFields;//手动添加objectid字段，用于排序。
        }
        param.returnIdsOnly = false;
        param.f = "json";
        $.ajax({
            type: "POST",
            url: dataTab.url + "/" + dataTab.layerId + "/query",
            cache: false,  //禁用缓存
            data: param,  //传入组装的参数
            dataType: "json",
            success: function (response) {
                if (response.error !== undefined) {
                    this.AppX.runtimeConfig.toast.Show("查询" + dataTab.title + "失败，请联系管理员");
                    return;
                }
                var theadData = [];
                var tbodyData = [];
                var theadnamesData = [];

                //按currentobjectids，对要素集合排序
                var currentobjectids = param.objectIds.split(',');
                for (var i = 0; i < currentobjectids.length; i++) {
                    var objectid = parseInt(currentobjectids[i]);
                    var index = _.findIndex(response.features, function (item: any) { return item.attributes["OBJECTID"] == objectid });
                    if (index != -1) {
                        var feature = response.features[index];
                        var row = [];
                        if (dataTab.outFields != null) {
                            for (var j = 0; j < dataTab.outFields.length; j++) {
                                row.push(feature.attributes[dataTab.outFields[j].toUpperCase()]);
                            }
                        }
                        else {
                            //缺少字段配置时，显示全部字段
                            for (var j = 0; j < response.fields.length; j++) {
                                row.push(feature.attributes[response.fields[j].name]);
                            }
                        }
                        tbodyData.push(row);
                    }
                }
                if (dataTab.outFields != null) {
                    for (var i = 0; i < dataTab.outFields.length; i++) {
                        theadnamesData.push(dataTab.outFields[i]);
                    }
                }
                else {
                    //缺少字段配置时，显示全部字段
                    for (var j = 0; j < response.fields.length; j++) {
                        theadnamesData.push(response.fields[j].name);
                        theadData.push(response.fields[j].alias);
                    }
                    dataTab.table.thead = theadData;
                }
                dataTab.table.tbody = tbodyData;
                dataTab.table.theadnames = theadnamesData;
                dataTab.draw = 1;
                dataTab.currentobjectids = param.objectIds;
                this.createServersideTable(tableObj, dataTab);
            }.bind(this)
        });
    }

    /**
    * (方法说明)查询当前页的数据
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    queryCurrenPageData(queryurl, param, dataTab, callback) {
        param.orderByFields = undefined;
        $.ajax({
            type: "POST",
            url: queryurl,
            cache: false,  //禁用缓存
            data: param,  //传入组装的参数
            dataType: "json",
            success: function (result) {
                if (result.error !== undefined) {
                    this.AppX.runtimeConfig.toast.Show("查询" + dataTab.title + "失败，请联系管理员");
                    return;
                }
                var tbodyData = [];
                //按currentobjectids，对要素集合排序
                var currentobjectids = param.objectIds.split(',');
                for (var i = 0; i < currentobjectids.length; i++) {
                    var objectid = parseInt(currentobjectids[i]);
                    var index = _.findIndex(result.features, function (item: any) { return item.attributes["OBJECTID"] == objectid });
                    if (index != -1) {
                        var feature = result.features[index];
                        var row = [];
                        if (dataTab.outFields != null) {
                            for (var j = 0; j < dataTab.outFields.length; j++) {
                                row.push(feature.attributes[dataTab.outFields[j].toUpperCase()]);
                            }
                        }
                        else {
                            //缺少字段配置时，显示全部字段
                            for (var j = 0; j < result.fields.length; j++) {
                                row.push(feature.attributes[result.fields[j].name]);
                            }
                        }
                        tbodyData.push(row);
                    }
                }
                //格式化日期
                var dateColumns = [];//记录日期字段序号
                dataTab.table.thead.forEach((name, index) => {
                    if (/[时间|日期]/g.test(name)) {
                        dateColumns.push(index);
                    }
                });
                if (dateColumns.length > 0)
                    for (var rowindex = 0; rowindex < tbodyData.length; rowindex++) {
                        for (var cindex = 0; cindex < dateColumns.length; cindex++) {
                            tbodyData[rowindex][dateColumns[cindex]] = this.getUTCDate(tbodyData[rowindex][dateColumns[cindex]]);
                        }
                    }
                //格式化日期
                var returndata: any = {};
                dataTab.draw++;
                dataTab.currentobjectids = param.objectIds;
                returndata.draw = dataTab.draw;
                returndata.recordsTotal = dataTab.objectids.length;
                returndata.recordsFiltered = dataTab.objectids.length;
                returndata.data = tbodyData;
                callback(returndata);
                this.refitTableHeight();
                dataTab.table.tbody = tbodyData;
                this.AppX.runtimeConfig.loadMask.Hide();
            }.bind(this),
            error: function (data) {
                this.AppX.runtimeConfig.loadMask.Hide();
                this.AppX.runtimeConfig.toast.Show("查询" + dataTab.title + "失败，请联系管理员");
                console.error(data);
            }.bind(this)
        });
    }
    /**
    * (方法说明)获取当前页的objectid集合
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    getCurrentPageOIDs(objectids: Array<number>, pageindex: number, pagesize: number) {
        var subobjectids = [];
        var total = objectids.length;
        var page = total / pagesize;
        var totalpage = total % pagesize > 0 ? page + 1 : page;
        if (pageindex <= totalpage) {
            var startindex = (pageindex - 1) * pagesize;
            var endindex = (pageindex) * pagesize;
            for (var i = startindex; i <= total && i < endindex; i++) {
                subobjectids.push(objectids[i]);
            }
        }
        return subobjectids;
    }

    /**
    * (方法说明)初始化表格
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)}boolean (参数名)serverside(参数说明)是否后台分页
    * @return {(返回值类型)} (返回值说明)
    */
    initTable(serverside: boolean) {
        if (!serverside)
            for (var i = 0, j = this.data.tabs.length; i < j; i++) {
                var currentTab = this.data.tabs[i];
                var selector = '#' + this.idPrefix + currentTab.id + ' table';
                this.createTable(this.domObj.find(selector), currentTab);
            }
        else
            for (var i = 0, j = this.data.tabs.length; i < j; i++) {
                var currentTab = this.data.tabs[i];
                var selector = '#' + this.idPrefix + currentTab.id + ' table';
                //this.createServersideTable(this.domObj.find(selector), currentTab);
                this.queryFirstPageData(this.domObj.find(selector), currentTab);
            }
    }
    /**
    * (方法说明)从服务端导出表个数据到文件
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    exportDataOnServer(dataTab: DataTabs) {
        var data: any = {
            layerurl: dataTab.url + "/" + dataTab.layerId + "/query",
            layername: dataTab.title,
            objectids: dataTab.objectids.join(',')
        };
        if (dataTab.outFields) {
            data.outfields = dataTab.outFields.join(',');
        }
        this.AppX.runtimeConfig.loadMask.Show("正在执行中，请耐心等待...");
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken
            },
            type: 'POST',
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + "/gis/export",//url: "http://192.98.151.39/webapi/api/gis/export",//AppX.appConfig.apiroot.replace(/\/+$/, "") + "/gis/export",
            data: data,
            success: this.onExportOnServer.bind(this),
            error: this.onExportOnServerError.bind(this),
            dataType: "json"
        });
    }
    /**
    * (方法说明)服务端导出数据接口的回调
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    onExportOnServer(data) {
        this.AppX.runtimeConfig.loadMask.Hide();
        if (data.code != 10000) {
            this.AppX.runtimeConfig.toast.Show("导出数据出错！");
            return;
        }
        else if (data.result.fileid) {
            var url = AppX.appConfig.apiroot.replace(/\/+$/, "") + "/webapp/tempfile/" + data.result.fileid;//"http://192.98.151.39/webapi/api/webapp/tempfile/" + data.result.fileid//;
            var f = document.createElement("form");
            document.body.appendChild(f);
            var i = document.createElement("input");
            i.type = "hidden";
            f.appendChild(i);
            // i.value = "5";
            // i.name = "price";
            f.action = url;  //下载的url 地址
            f.submit();
            f.remove();
        }
    }
    onExportOnServerError(data) {
        this.AppX.runtimeConfig.loadMask.Hide();
        this.AppX.runtimeConfig.toast.Show("导出数据出错！");
    }

    getDataTime() {
        var date = new Date();
        var resultArr = new Array();

        resultArr.push(date.getFullYear());
        resultArr.push(date.getMonth() + 1);
        resultArr.push(date.getDate());
        resultArr.push(date.getHours());
        resultArr.push(date.getMinutes());
        resultArr.push(date.getSeconds());
        resultArr.push(date.getMilliseconds());

        return resultArr.join('-');
    }

    Destroy() {

    }

    /**
    * (方法说明)格式化日期，用于arcgis 要素属性日期格式问题
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    getUTCDate(milliSecUnix) {
        var d, mm, dd;
        if (milliSecUnix) {
            d = new Date(milliSecUnix);
            mm = d.getUTCMonth() + 1;
            dd = d.getUTCDate();
            return (d.getUTCFullYear() + "-" +
                ((mm < 10) ? "0" + mm : mm) + "-" +
                ((dd < 10) ? "0" + dd : dd));
        }
        else {
            return "";
        }
    }

}