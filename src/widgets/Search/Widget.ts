import BaseWidget = require('core/BaseWidget.class');
import Map = require("esri/map");
import MapImageLayer = require("esri/layers/MapImageLayer");
import Point = require("esri/geometry/Point");
import FindTask = require("esri/tasks/FindTask");
import FindParameters = require("esri/tasks/FindParameters");

// import watchUtils = require("esri/core/watchUtils");
import Popup = require("esri/dijit/Popup");
import PopupTemplate = require("esri/dijit/PopupTemplate");
import MarkerSymbol = require("esri/symbols/MarkerSymbol");
import SimpleMarkerSymbol = require("esri/symbols/SimpleMarkerSymbol");
import Color = require("esri/Color");


declare var proj4;
export = Search;

class Search extends BaseWidget {
    baseClass: string = "widget-search";
    private jDom: JQuery;
    private menuLabelAttr: string = 'data-label';
    private menuValueAttr: string = 'data-index';
    private currentFilterType: any;
    private map: Map;
    private popUpContent: string = "<div class=\"<%=searchTheme%>\"><div id=\"<%=searchMoreResultsId%>\" class=\"<%=searchMoreResults%>\"><div class=\"<%=moreResultsSelectedItem%>\"><%=searchResult%></div><div><%=searchMoreResultsHtml%></div></div></div>"
    private optioncontent: string = "<a class=\"list-group-item\"><span class=\"glyphicon glyphicon-search\" aria-hidden=\"true\"></span><%=itemvalue%></a>";
    // private popupTemplate: string = "";
    private moreResultsId: string = "show_more_results";
    private results: any[] = [];
    private resultsSelectedIndex: number = 0;
    private css = {
        base: "widget-search-popup",
        hasValue: "widget-search--has-value",
        hasMultipleSources: "widget-search--multiple-sources",
        isSearchLoading: "widget-search--loading",
        showSuggestions: "widget-search--show-suggestions",
        showSources: "widget-search--sources",
        showNoResults: "widget-search--no-results",
        container: "widget-search__container",
        input: "widget-search__input",
        inputContainer: "widget-search__input-container",
        form: "widget-search__form",
        submitButton: "widget-search__submit-button",
        sourcesButton: "widget-search__sources-button",
        clearButton: "widget-search__clear-button",
        sourceName: "widget-search__source-name",
        suggestionsMenu: "widget-search__suggestions-menu",
        sourcesMenu: "widget-search__sources-menu",
        source: "widget-search__source",
        activeSource: "widget-search__source--active",
        noResultsMenu: "widget-search__no-results-menu",
        noResultsBody: "widget-search__no-results-body",
        noResultsHeader: "widget-search__no-results-header",
        noResultsText: "widget-search__no-results-text",
        noValueText: "widget-search__no-value-text",
        showMoreResults: "widget-search__more-results--show-more-results",
        moreResults: "widget-search__more-results",
        moreResultsList: "widget-search__more-results-list",
        moreResultsHeader: "widget-search__more-results-header",
        moreResultsLatLonHeader: "widget-search__more-results-lat-long-header",
        moreResultsItem: "widget-search__more-results-item",
        moreResultsSelectedItem: "widget-search__selected-results-item",
        moreResultsListHeader: "widget-search__more-results-list-header",

        // icons + common
        button: "esri-widget-button",
        fallbackText: "esri-icon-font-fallback-text",
        rotating: "esri-rotating",
        menu: "esri-menu",
        header: "esri-header",
        searchIcon: "esri-icon-search",
        dropdownIcon: "esri-icon-down-arrow esri-search__sources-button--down",
        dropupIcon: "esri-icon-up-arrow esri-search__sources-button--up",
        clearIcon: "esri-icon-close",
        spinnerIcon: "esri-icon-loading-indicator",
        noticeIcon: "esri-icon-notice-triangle"
    };

    private cpLock = false;//标记是否在中文输入法状态
    private maxoptions = 10;
    private optionsDom: JQuery;
    private inputDom: any;
    private options = [];
    private selectedIndex = 0;//维护可选项列表选中项索引
    optionLock = true;//标记鼠标在下拉列表上的状态    
    private delay = (function () {
        var timer = 0;
        return function (callback, ms) {
            clearTimeout(timer);
            timer = setTimeout(callback, ms);
        };
    })();

    startup() {
        this.map = this.AppX.runtimeConfig.map;
        this.setHtml(this.template);
        this.jDom = this.domObj;
        this.optionsDom = this.domObj.find('.options');
        this.inputDom = this.domObj.find('.input-value');
        this.initData();
        this.initEventHandler();
        this.ready();
    }
    destroy() {
        // super.destroy();
        this.domObj.off();
        this.domObj.remove();
        this.afterDestroy();
    }
    /*** 自定义模块内成员 ***/

    /**
    * (方法说明)初始化界面数据显示
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private initData() {
        this.maxoptions = this.config.maxoptions;
        var filterOptions: any[] = this.config.filterOptions;
        if (filterOptions !== undefined) {
            var menu: JQuery = this.jDom.find('.btn-filtertype').last();
            $.each(filterOptions, function (index, item) {
                var that: Search = this;
                var menuItemTemplate = "<li><a></a></li>";
                $(menuItemTemplate).appendTo(menu).attr(that.menuValueAttr, index).on('click', $.proxy(that.onFilterTypeClick, this)).find('a').text(item.label);
            }.bind(this));
            if (filterOptions.length > 0) {
                //默认选择第一个
                menu.find('li').first().trigger('click');
            }
        }
    };

    private popupOptions = {
        markerSymbol: new SimpleMarkerSymbol("circle", 32, null,
            new Color([0, 0, 0, 0.25])),
        marginLeft: "20",
        marginTop: "20"
    };

    private popupTemplate: PopupTemplate = new PopupTemplate({
        title: "{address}",
        showAttachments: true
    });

    /**
    * (方法说明)初始化事件处理
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private initEventHandler() {
        this.jDom.find(".btn-search").off();
        this.jDom.find(".btn-search").off();
        this.domObj
            .on('input propertychange', '.input-value', this.onInputValueChange.bind(this))
            .on('compositionstart', '.input-value', function () { this.cpLock = true; }.bind(this))
            .on('compositionend', '.input-value', function () {
                this.cpLock = false;
                if (this.currentFilterType.value == 'poi') {
                    this.delay(this.queryOptionsByPOI.bind(this), 2000);
                }
            }.bind(this))
        this.jDom.find(".btn-search").on('click', $.proxy(this.onSearchClick, this));
        this.jDom.find(".input-value").on('keydown', $.proxy(this.onInputKeyPress, this));
        this.domObj
            .on('click', '.list-group-item', this.onOptionClick.bind(this))
            .on('mouseover', '.list-group-item', function () { this.optionLock = true; }.bind(this))
            .on('mouseout', '.list-group-item', function () { this.optionLock = false; }.bind(this));

        // this.initPopupHander();
        this.inputDom.focusout(function () {
            if (!this.optionLock)
                this.clearOptions();
        }.bind(this));
    };

    private onOptionClick(event) {
        var selectedValue = event.currentTarget.text;
        this.inputDom.val(selectedValue);
        this.clearOptions();
        this.search();
    }

    /**
    * (方法说明)查询框输入值变化时回调函数，实时搜索可选项集合
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private onInputValueChange(event) {
        if (!this.cpLock) {
            if (this.currentFilterType.value == 'poi') {
                this.delay(this.queryOptionsByPOI.bind(this), 2000);
                // this.queryOptionsByPOI(address);
            }
        }
    }
    /**
    * (方法说明)初始化信息窗体事件处理
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private initPopupHander() {
        var popup: any = this.map.infoWindow;
        popup.anchor = "top-right";
        // watchUtils.watch(popup, 'visible', function () {
        var showMore: JQuery = $("#" + this.moreResultsId + "_show");
        var showMoreItem: JQuery = $("#" + this.moreResultsId + "_list li a");
        // if (this.map.infoWindow.isShowing) {
        if (showMore.length > 0)
            showMore.on('click', this._handleShowMoreResultsClick.bind(this));
        if (showMoreItem.length > 0)
            showMoreItem.on('click', this._handleMoreResultClick.bind(this));
    }
    /**
    * (方法说明)搜索按钮单击事件处理函数
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private onSearchClick(event: any) {
        this.search();
    }
    /**
    * (方法说明)输入框按键事件处理函数（上下翻页和回车）
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private onInputKeyPress(event: any) {
        switch (event.keyCode) {
            case 38:
                // 向上翻页
                if (this.options.length > 0) {
                    this.optionsDom.find('a:nth-child(' + this.selectedIndex + ")").removeClass('selected');
                    if (this.selectedIndex == 0)
                        this.selectedIndex = this.options.length;
                    if (this.selectedIndex == 1)
                        this.selectedIndex = this.options.length;
                    else
                        this.selectedIndex -= 1;
                    if (this.selectedIndex > 0) {
                        var selectedValue = this.optionsDom.find('a:nth-child(' + this.selectedIndex + ")").addClass('selected').text();
                        this.inputDom.val(selectedValue);
                    }
                }
                event.stopPropagation();
                event.preventDefault();
                break;
            case 40:
                // 向下翻页
                if (this.options.length > 0) {
                    this.optionsDom.find('a:nth-child(' + this.selectedIndex + ")").removeClass('selected');
                    if (this.selectedIndex >= this.options.length)
                        this.selectedIndex = 1;
                    else
                        this.selectedIndex += 1;
                    if (this.selectedIndex > 0) {
                        //var selectedValue = this.options[this.selectedIndex];
                        var selectedValue = this.optionsDom.find('a:nth-child(' + this.selectedIndex + ")").addClass('selected').text();
                        this.inputDom.val(selectedValue);
                    }
                }
                event.stopPropagation();
                event.preventDefault();
                break;
            case 13:
                //回车键
                this.clearOptions();
                this.search();
                event.stopPropagation();
                event.preventDefault();
                break;
        }
    };
    /**
    * (方法说明)搜索类型列表单击事件处理函数
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private onFilterTypeClick(event: any) {
        var selectedDom: any = event.currentTarget;
        this.jDom.find('.btn-filter').html(selectedDom.textContent + '<span class="caret"></span>');
        var dataIndex: number = selectedDom.attributes[this.menuValueAttr].value;
        this.currentFilterType = this.config.filterOptions[dataIndex];
        this.inputDom.val('').prop('placeholder', this.currentFilterType.tip);
    };
    /**
    * (方法说明)
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private search() {
        // this.map.infoWindow.hide();
        var filterValue: string = this.jDom.find('.input-value').val();
        if (filterValue === undefined || filterValue.trim().length == 0)
            return;
        switch (this.currentFilterType.value) {
            case 'coordinate':
                this.goToCoordinate(filterValue);
                break;
            case 'prjcoordinate':
                this.goToPrjCoordinate(filterValue);
                break;
            case 'poi':
                this.queryByPOI(filterValue);
                break;
            case 'gridid':
                this.queryByGridNumber(filterValue);
                break;
        }
        // if (this.currentFilterType.value == 'coordinate') {
        //     this.goToCoordinate(filterValue);
        // }
        // else if (this.currentFilterType.value == 'poi') {
        //     this.queryByPOI(filterValue);
        // }
        // else if (this.currentFilterType.value == 'gridid') {
        //     this.queryByGridNumber(filterValue);
        // }
    };
    /**
    * (方法说明)地名模糊查询
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private queryByPOI(filterValue: string) {
        if (this.AppX.appConfig.gisResource[this.currentFilterType.queryurl].config.length == 0)
            return;
        var url = this.AppX.appConfig.gisResource[this.currentFilterType.queryurl].config[0].url;
        var find: FindTask = new FindTask(url);

        // Set parameters to only query the Counties layer by name
        var params: FindParameters = new FindParameters();
        params.layerIds = this.currentFilterType.layerids || [0];
        params.searchFields = this.currentFilterType.queryFields || ["TEXT"];
        params.returnGeometry = true;

        params.searchText = filterValue.trim();
        find.execute(params)
            .then(this.showResults.bind(this))
            .otherwise(this.rejectedError.bind(this));
    };
    /**
    * (方法说明)以信息窗方式显示搜索结果
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private showResults(response) {
        if (response && response.length > 0) {
            this.resultsSelectedIndex = 0;
            this.results = response;
            this.initPopupShow(this.currentFilterType.label);
        }
        else {
            this.AppX.runtimeConfig.toast.Show("未搜索到相关数据！");
        }
    };
    /**
    * (方法说明)构建信息窗体
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private initPopupShow(title: string) {
        var selectedItem: any = this.results[0];
        var geometry = selectedItem.feature.geometry;
        var point: Point;
        if (geometry.type == "point")
            point = selectedItem.feature.geometry;
        else point = selectedItem.feature.geometry.getExtent().getCenter();
        point.spatialReference = this.map.spatialReference;
        var findeValue = selectedItem.value;
        var mixedTemplate = _.template(this.popUpContent)({
            searchTheme: this.css.base,
            searchMoreResults: this.css.moreResults,
            searchResult: this._toSearchResultHTML(selectedItem),
            moreResultsSelectedItem: this.css.moreResultsSelectedItem,
            searchMoreResultsId: this.moreResultsId,
            searchMoreResultsHtml: this._toMoreResultsHTML(this.results, 0)
        });

        // .open({
        //     title: "查找" + title,
        //     location: point,
        //     content: mixedTemplate
        // });
        this.map.infoWindow.setTitle("查找" + title);
        this.map.infoWindow.setContent(mixedTemplate);
        this.map.infoWindow.show(point);
        this.zoomToCenter(point);
        // this.initEventHandler();
        this.initPopupHander();
    }
    /**
    * (方法说明)显示在信息窗体中更多项列表中被选中的项
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private showSelectedItemInPopup(index: number) {
        var selectedItem: any = this.results[index];
        var geometry = selectedItem.feature.geometry;
        var point: Point;
        if (geometry.type == "point")
            point = selectedItem.feature.geometry;
        else point = selectedItem.feature.geometry.getExtent().getCenter();
        point.spatialReference = this.map.spatialReference;
        var findeValue = selectedItem.value;
        //改变当前选择项和更多项
        $('.' + this.css.moreResultsSelectedItem).text(findeValue);
        $("#" + this.moreResultsId + "_show").trigger('click');
        this.map.infoWindow.show(point);
        this.zoomToCenter(point);
    };

    private rejectedError(response) {
        // console.error(response);
        this.AppX.runtimeConfig.toast.Show("未搜索到相关数据！");
    };
    /**
    * (方法说明)构建信息窗体中更多选项的界面
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private _toMoreResultsHTML(results: any, index: number) {
        var html = "";
        var listHtml = "";
        var processedItems = 0;
        var result;
        var hasResults;
        if (results) {
            listHtml += "<div class=\"" + this.css.moreResultsItem + "\">";
            listHtml += "<a href=\"#\" id=\"" + this.moreResultsId + "_show" + "\">" + "显示更多结果" + "</a>";
            listHtml += "</div>";
            listHtml += "<div class=\"" + this.css.moreResultsList + "\">";
            listHtml += "<div id=\"" + this.moreResultsId + "_list" + "\">";
            for (var idx = 0; idx < results.length; idx++) {
                if (idx == index)
                    continue;
                result = results[idx];
                listHtml += "<ul>";
                var maxResults = results.length;
                listHtml += "<li><a tabindex=\"0\" data-index=\"" + idx + "\" data-source-index=\"" + idx + "\" href=\"#\">" + result.value + "</a></li>";
                processedItems++;
                listHtml += "</ul>";
            }
            listHtml += "</div>";
            listHtml += "</div>";
        }
        if (processedItems > 0) {
            html += listHtml;
        }
        return html;
    };
    /**
    * (方法说明)信息窗体中更多选项按钮单击事件处理函数
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private _handleShowMoreResultsClick(e) {
        e.preventDefault();//阻止事件的默认处理行为，即不会在浏览器地址添加#
        var node: JQuery = $('#' + this.moreResultsId);
        var resultsToggleLabel;

        if (node) {
            node.toggleClass(this.css.showMoreResults);
            var showMoreResultsNode: JQuery = $('#' + this.moreResultsId + "_show");
            if (showMoreResultsNode) {
                resultsToggleLabel = node.hasClass(this.css.showMoreResults) ?
                    "隐藏" :
                    "显示更多结果";
                showMoreResultsNode.text(resultsToggleLabel);
            }
        }
    };
    /**
    * (方法说明)信息窗体中更多选项列表单击事件处理函数
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private _handleMoreResultClick(e) {
        e.preventDefault();
        var target = $(e.target);
        var dataSourceIdx = parseInt(target.attr("data-source-index"), 10);
        var dataIdx = parseInt(target.attr("data-index"), 10);
        var results = this.results;

        if (results && results[dataSourceIdx]) {
            var selectFeature = results[dataSourceIdx];
            if (selectFeature) {
                this.resultsSelectedIndex = dataSourceIdx;
                this.showSelectedItemInPopup(this.resultsSelectedIndex);
            }
        }
    };

    private _closePopup() {
        this.map.infoWindow.hide();
    };
    /**
    * (方法说明)构建信息窗体中当前选中项的界面
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private _toSearchResultHTML(result) {
        var isLatLongType = result.feature &&
            result.feature.attributes &&
            result.feature.attributes.Addr_type &&
            result.feature.attributes.Addr_type === "LatLong";
        if (!isLatLongType) {
            return result.value;
        }
        var lonLat = result.value.split(" ");
        var lon, lat;
        if (lonLat.length === 2) {
            lon = lonLat[0];
            lat = lonLat[1];
        }
        if (!lat || !lon) {
            return result.value;
        }
        lon = parseFloat(lon);
        lat = parseFloat(lat);
        var originalCoords = lon + ", " + lat;
        var switchedCoords = lat + ", " + lon;
        var strings = "i18n";
        var html = "";
        html += "<div class=\"" + this.css.moreResultsItem + "\">";
        html += "<div class=\"" + this.css.moreResultsLatLonHeader + "\">" + strings + "</div>";
        html += originalCoords;
        html += "</div>";
        html += "<div class=\"" + this.css.moreResultsItem + "\">";
        return html;
    };

    /**
    * (方法说明)图幅号查询
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private queryByGridNumber(filterValue: string) {
        if (this.AppX.appConfig.gisResource[this.currentFilterType.queryurl].config.length == 0)
            return;
        var url = this.AppX.appConfig.gisResource[this.currentFilterType.queryurl].config[0].url;
        var find = new FindTask(url);

        // Set parameters to only query the Counties layer by name
        var params = new FindParameters();
        params.layerIds = this.currentFilterType.layerids || [0];
        params.searchFields = this.currentFilterType.queryFields || ["ENAME"];
        params.returnGeometry = true;
        params.searchText = filterValue.trim();
        find.execute(params)
            .then(this.showResults.bind(this))
            .otherwise(this.rejectedError.bind(this));
    };

    /**
    * (方法说明)经纬度坐标定位，需验证输入值的合法性:数值范围和格式(如：要以空格分隔xy值)
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private goToCoordinate(strPoint: string) {
        var firstIndex = strPoint.indexOf(' ');
        if (firstIndex == -1) {
            this.AppX.runtimeConfig.toast.Show("请输入以空格隔开的经度纬度！");
            return;
        }
        var xStr = strPoint.substr(0, firstIndex).trim();
        var yStr = strPoint.substr(firstIndex, strPoint.length-firstIndex).trim();
        var pointValus: string[] = strPoint.trim().split(' ');
        var x: number = parseFloat(xStr);
        var y: number = parseFloat(yStr);
        // x y 合法性判断
        if (!/^(-?\d+)(\.\d+)?$/.test(xStr)) {
            this.AppX.runtimeConfig.toast.Show("请输入合法的经度！");
            return;
        }
        if (!(x >= -180 && x <= 180)) {
            this.AppX.runtimeConfig.toast.Show("请输入合法的经度！");
            return;
        }
        if (!/^(-?\d+)(\.\d+)?$/.test(yStr)) {
            this.AppX.runtimeConfig.toast.Show("请输入合法的纬度！");
            return;
        }
        if (!(y >= -90 && y <= 90)) {
            this.AppX.runtimeConfig.toast.Show("请输入合法的纬度！");
            return;
        }
        var point = new Point(x, y);
        if (this.map !== undefined) {
            point.spatialReference = this.map.spatialReference;
            this.map.infoWindow.setTitle("查找坐标");
            this.map.infoWindow.setContent("[" + x + ", " + y + "]");
            this.map.infoWindow.show(point);
            this.zoomToCenter(point);
        }
    };
      /**
    * (方法说明)平面坐标定位，需验证输入值的合法性:数值范围和格式(如：要以空格分隔带号xy值)
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private goToPrjCoordinate(strPoint: string) {
        var firstIndex = strPoint.indexOf(' ');
        if (firstIndex == -1) {
            this.AppX.runtimeConfig.toast.Show("请输入以空格隔开的带号X坐标、Y坐标！");
            return;
        }
        var daiHaoXStr = strPoint.substr(0,firstIndex).trim();
        var daiHaoStr = daiHaoXStr.substring(0,2);
        var xStr = daiHaoXStr.substr(2,daiHaoXStr.length-2);
        var yStr = strPoint.substr(firstIndex, strPoint.length-firstIndex).trim();
        var pointValus: string[] = strPoint.trim().split(' ');
        var daihao:number = parseFloat(daiHaoStr);
        var x: number = parseFloat(xStr);
        var y: number = parseFloat(yStr);
        //带号 x y 合法性判断
        if (!/^[0-9]*$/.test(daiHaoStr)) {
            this.AppX.runtimeConfig.toast.Show("请输入合法的带号！");
            return;
        }
        if (!(daihao>0 && daihao <=60)) {
            this.AppX.runtimeConfig.toast.Show("请输入合法的带号！");
            return;
        }
        if (!/^(-?\d+)(\.\d+)?$/.test(xStr)) {
            this.AppX.runtimeConfig.toast.Show("请输入合法的X坐标！");
            return;
        }
        if (!/^(-?\d+)(\.\d+)?$/.test(yStr)) {
            this.AppX.runtimeConfig.toast.Show("请输入合法的Y坐标！");
            return;
        }
        var pointValue = this.prj(x,y,daihao);
        var point = new Point(pointValue.x, pointValue.y);
        if (this.map !== undefined) {
            point.spatialReference = this.map.spatialReference;
            this.map.infoWindow.setTitle("查找坐标");
            this.map.infoWindow.setContent("[" + parseFloat(daiHaoXStr) + ", " + y + "]");
            this.map.infoWindow.show(point);
            this.zoomToCenter(point);
        }
    };

    private prj(x,y,daihao){
        var wkid = daihao+4509;
        var CentralMeridian = 3 * (wkid - 4509);//中央经度
        proj4.defs('EPSG:4490', 'GEOGCS["GCS_China_Geodetic_Coordinate_System_2000",DATUM["D_China_2000",SPHEROID["CGCS2000",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433],AUTHORITY["EPSG",4490]]');//经纬度坐标
        proj4.defs('EPSG:4544', 'PROJCS["CGCS2000_3_Degree_GK_CM_105E",GEOGCS["GCS_China_Geodetic_Coordinate_System_2000",DATUM["D_China_2000",SPHEROID["CGCS2000",6378137.0,298.257222101]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["False_Easting",500000.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",' + CentralMeridian + '],PARAMETER["Scale_Factor",1.0],PARAMETER["Latitude_Of_Origin",0.0],UNIT["Meter",1.0],AUTHORITY["EPSG",4544]]');//投影坐标
        var result = proj4('EPSG:4544','EPSG:4490', [x,y]);
        return {x:result[0],y:result[1]};
    }
    /**
    * (方法说明)通过地名搜索可选项
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private queryOptionsByPOI() {
        var filterValue = this.jDom.find('.input-value').val().trim();
        this.selectedIndex = 0;
        if (filterValue == undefined || filterValue.length == 0) {
            this.optionsDom.empty();
            return;
        }
        console.log("search for:" + filterValue);
        if (this.AppX.appConfig.gisResource[this.currentFilterType.queryurl].config.length == 0)
            return;
        var url = this.AppX.appConfig.gisResource[this.currentFilterType.queryurl].config[0].url;
        var find: FindTask = new FindTask(url);
        // Set parameters to only query the Counties layer by name
        var params: FindParameters = new FindParameters();
        params.layerIds = this.currentFilterType.layerids || [0];
        params.searchFields = this.currentFilterType.queryFields || ["TEXT","ADDRESS"];
        params.returnGeometry = false;

        params.searchText = filterValue.trim();
        find.execute(params)
            .then(this.showOptions.bind(this))
            .otherwise(this.rejectedError.bind(this));
    };
    /**
    * (方法说明)在界面显示搜索下拉可选项
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private showOptions(result) {
        this.optionsDom.empty();
        if (result && result.length > 0) {
            // this.resultsSelectedIndex = 0;
            // this.results = result;
            // this.initPopupShow(this.currentFilterType.label);
            //提取最大10项可选值
            var options = [];
            for (var j = 0; j < result.length; j++) {
                if (options.length < this.maxoptions) {
                    if (_.findIndex(options, function (o: any) { return o == result[j].value }) == -1) {
                        options.push(result[j].value);
                    }
                }
            }
            this.options = options;
            //显示可选值到界面
            //自定义列表方式
            if (this.optionsDom) {
                for (var i = 0; i < options.length; i++) {
                    var mixedTemplate = _.template(this.optioncontent)({
                        itemvalue: options[i]
                    });
                    $(mixedTemplate).appendTo(this.optionsDom);
                }
            }
            else {
                this.AppX.runtimeConfig.toast.Show("未搜索到相关数据！");
            }
            //jquery ui方式
            // this.inputDom.autocomplete({
            //     source: options
            // });
        };


    };
    /**
    * (方法说明)清理搜索下拉可选项
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private clearOptions() {
        this.optionsDom.empty();
        this.selectedIndex = 0;
        this.options = [];
    };

    private zoomToCenter(point) {
        this.map.setScale(this.config.zoomscale);
        this.map.centerAt(point);
    }
}