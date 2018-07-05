import Base = require('core/Base.class');
import Functions = require('core/Functions.module');
import Map = require("esri/map");
import Point = require("esri/geometry/Point");

export = TourTip;

interface InfoWindow {//记录tab的数据查询条件,用于再次排序
    id: string,
    domobj: JQuery,
    point: Point,
    content: String
}

class TourTip extends Base {
    private map: Map = null;
    private windows: Array<InfoWindow> = []//浮动窗体集合
    private mapEvents = [];
    private initWidth: '230px';
    private initHeight: '125px';
    private infoWindowContainner = "<div class=\"tourtip-containner\"/>";
    private inforWindowxTemplate = "<div class=\"tourtip-anchor\"><div class=\"tourtip\"><div class=\"infoWindowx-PopupWrapper\"><div class=\"infoWindowx-sizer\"><div class=\"infoWindowx-titlePane\"><div class=\"infoWindowx-title\"></div><div class=\"infoWindowx-titleButton close\" title=\"关闭\"></div></div></div><div class=\"infoWindowx-pointer bottomLeft\"></div><div class=\"infoWindowx-sizer content\"><div class=\"infoWindowx-contentPane\"></div></div></div></div></div>"
    private offsetx = -5;
    private offsety = 4;
    /**
    * (方法说明)构造函数
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    constructor(settings: {
        map: Map,
    }) {
        super();
        // 使用 settings
        this.map = settings.map;
        this.initEvent();
    }
    /**
    * (方法说明)初始化事件绑定
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private initEvent() {
        this.mapEvents.push(this.map.on("extent-change", this.mapExtentChange.bind(this)));
        this.mapEvents.push(this.map.on("pan", this.mapPan.bind(this)));
        this.mapEvents.push(this.map.on("zoom-start", this.zoomStartEvent.bind(this)));
        this.mapEvents.push(this.map.on("zoom-end", this.zoomEndEvent.bind(this)));
    }
    public AddNew(setting: {
        id: string,
        title: string,
        content: string,
        point: Point
    }) {
        var infowindow = null;
        var index = _.findIndex(this.windows, function (infowindow) { return infowindow.id == setting.id });
        if (index != -1) {//已存在相同编号的窗体，终止新建,只更新
            infowindow = this.windows[index].domobj;
            var screenPoint = this.map.toScreen(setting.point);
            infowindow.css("left", screenPoint.x + this.offsetx + "px");
            infowindow.css("top", screenPoint.y + this.offsety + "px");
            infowindow.find('.infoWindowx-title').text(setting.title);
            this.windows[index].point = setting.point;
            if (this.windows[index].content != setting.content) {
                infowindow.find('.infoWindowx-contentPane').empty().append(setting.content);
                this.windows[index].content = setting.content;
            }
            return;
        }
        //构建浮动窗体容器,保证浮动窗体在地图上面
        var inforContainner = $('.tourtip-containner');
        if (inforContainner.length == 0) {
            inforContainner = ($(".widgets-basemap")).after($(this.infoWindowContainner));
        }
        //构建浮动窗体
        infowindow = $(this.inforWindowxTemplate).appendTo(inforContainner);
        var screenPoint = this.map.toScreen(setting.point);
        infowindow.css("left", screenPoint.x + this.offsetx + "px");
        infowindow.css("top", screenPoint.y + this.offsety + "px");
        infowindow.find('.infoWindowx-contentPane').append(setting.content);
        infowindow.css('width', this.initWidth);
        infowindow.css('height', this.initHeight);
        infowindow.find('.infoWindowx-title').text(setting.title);
        infowindow.addClass("scada" + setting.id);
        infowindow.on('click', '.close', function (event) {
            event.stopPropagation();
            infowindow.hide();
        }.bind(this))
            .on('click', function (event) { infowindow.appendTo(inforContainner) }.bind(this));
        this.windows.push({ id: setting.id, domobj: infowindow, point: setting.point, content: setting.content });
    }

    public ShowInfoWindow(ptid: string) {
        var index = _.findIndex(this.windows, function (infowindow) { return infowindow.id == ptid });
        if (index != -1) {
            this.windows[index].domobj.appendTo($('.tourtip-containner')).show();
        }
    }

    public UpdateInfoWindow(data: Array<any>) {
        //刷新被打开的窗体
        data.forEach(item => {
            var index = _.findIndex(this.windows, function (infowindow) { return infowindow.id == item.ptid });
            if (index != -1) {
                item.values.forEach(value => {
                    var targetdom = this.windows[index].domobj.find('td[data-name="' + value.name + '"]');
                    if (targetdom.length > 0)
                        targetdom.text(value.value + value.unit);
                });
            }
        });
    }

    /**
    * (方法说明)获取可见窗体，用于刷新数据
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    public GetVisibleWindowIDs() {
        var ids: Array<string> = [];
        this.windows.forEach(infonwindow => {
            if (infonwindow.domobj.css('display') != 'none' && this.IsInCurrentMapExtent(infonwindow.point))
                ids.push(infonwindow.id);
        });
        return ids;
    }

    private IsInCurrentMapExtent(point: Point) {
        var extent = this.map.extent;
        if (point.x < extent.xmin || point.x > extent.xmax)
            return false;
        if (point.y < extent.ymin || point.y > extent.ymax)
            return false;
        return true;
    }

    /**
    * (方法说明)清理方法
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    public Clean() {
        this.ClearWindow();
        //移除地图事件
        this.mapEvents.forEach(event => {
            event.remove();
        })
        $('.tourtip-containner').off().remove();
    }

    public ClearWindow() {
        this.windows.forEach(infonwindow => {
            infonwindow.domobj.off();
            infonwindow.domobj.remove();
        });
        this.windows = [];
    }

    private mapExtentChange(event) {
        this.windows.forEach(infonwindow => {
            var screenPoint = this.map.toScreen(infonwindow.point);
            infonwindow.domobj.css("left", screenPoint.x + this.offsetx + "px");
            infonwindow.domobj.css("top", screenPoint.y + this.offsety + "px");
        });
    }

    private mapPan(event) {
        this.windows.forEach(infonwindow => {
            var screenPoint = this.map.toScreen(infonwindow.point);
            var left = screenPoint.x + event.delta.x;
            var top = screenPoint.y + event.delta.y;
            infonwindow.domobj.css("left", left + this.offsetx + "px");
            infonwindow.domobj.css("top", top + this.offsety + "px");
        });
    }

    private zoomStartEvent(event) {
        this.windows.forEach(infonwindow => {
            infonwindow.domobj.find('.tourtip').hide();
        });
    }

    private zoomEndEvent(event) {
        this.windows.forEach(infonwindow => {
            var screenPoint = this.map.toScreen(infonwindow.point);
            infonwindow.domobj.css("left", screenPoint.x + this.offsetx + "px");
            infonwindow.domobj.css("top", screenPoint.y + this.offsety + "px");
        });
        this.windows.forEach(infonwindow => {
            infonwindow.domobj.find('.tourtip').show();
        });
    }
}