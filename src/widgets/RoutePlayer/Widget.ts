import BaseWidget = require('core/BaseWidget.class');
import Map = require("esri/map");
import Tour = require("./Tour");

export = RoutePlayer;

/**
* Description:调用方式this.AppX.runtimeConfig.routeplayer.Show(this.config.gpsstops, true);
* @module 
*/
class RoutePlayer extends BaseWidget {
    baseClass = "widget-routeplayer";

    //临时变量//new Date("2017-09-20 09:50:00"),new Date("2017-09-20 10:02:00")
    start_time: any = "2017-09-20 09:59:55";
    end_time: any = "2017-09-20 10:02:10";
    interval = 5;//gps数据采样时间间隔,大于此时间段视为缺失数据

    //内部变量
    value = 0;//百分比形式记录当前滑块值
    class_play = "glyphicon-play";
    class_pause = "glyphicon-pause";
    map: Map = null;
    tour: Tour = null;//轨迹播放工具
    mapEvents = [];//模块内地图事件记录
    gpsdata = null;//gps轨迹数据，从外部传入
    option: RoutePlayerOption;

    startup() {
        if ($("." + this.baseClass).length > 0) {
            $("." + this.baseClass).off().remove();
        }
        this.AppX.runtimeConfig.routeplayer = this;
        this.ready();
    }
    /**
    * (方法说明)初始化
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    init(gpsdata?: Array<any>, options?: RoutePlayerOption) {
        if (gpsdata)
            this.gpsdata = gpsdata;
        else this.gpsdata = this.config.gpsstops;
        this.value = 0;
        this.start_time = this.gpsdata[0][this.config.timefield];
        this.end_time = this.gpsdata[this.gpsdata.length - 1][this.config.timefield];
        this.start_time = new Date(this.start_time);
        this.end_time = new Date(this.end_time);
        this.map = this.AppX.runtimeConfig.map;
        this.option = options;
        //设置播放时间为轨迹时间10倍缩小，最小限制为10S
        if (gpsdata.length > 1) {
            var totaltimespan = (this.end_time - this.start_time) / (10 * 1000);
            if (totaltimespan > this.config.total_timespan)
                this.config.total_timespan = totaltimespan;
        }
        this.initPage();
        this.initEvent();
        this.initAmationFunction();
        if (this.tour != null) {
            this.tour.clear();
        }
        this.tour = new Tour({
            map: this.map,
            data: this.gpsdata,
            timefield: this.config.timefield,
            xfield: this.config.xfield,
            yfield: this.config.yfield,
            timegap: this.config.timegap,
            networkfield: this.config.networkfield,
            gpsfield: this.config.gpsfield,
            option: this.option,
            callback: this.onRoutePlayCompleted.bind(this)
        });
    }

    /**
    * (方法说明)显示模块
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)gpsdata-轨迹数组，iscar-可选参数，是否是车巡，图标不同
    * @return {(返回值类型)} (返回值说明)
    */
    Show(gpsdata: Array<any>, options?: RoutePlayerOption) {
        if ($("." + this.baseClass).length > 0) {
            $("." + this.baseClass).off().remove();
        }
        this.mapEvents.forEach(event => {
            event.remove();
        });
        if (this.tour != null)
            this.tour.clear();
        if (!gpsdata || gpsdata.length < 2) {
            this.AppX.runtimeConfig.toast.Show("轨迹点不足两个，不能显示轨迹!");
            return;
        }
        this.setHtml(this.template);
        this.init(gpsdata, options);
        this.parseRoute();
        //实现加载模块时自动播放
    }

    /**
    * (方法说明)隐藏模块
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    Hide() {
        if (this.domObj)
            this.domObj.off().remove();
        if ($("." + this.baseClass).length > 0) {
            $("." + this.baseClass).off().remove();
        }
        this.mapEvents.forEach(event => {
            event.remove();
        });
        if (this.tour != null)
            this.tour.clear();
    }

    destroy() {
        //移除地图事件
        this.mapEvents.forEach(event => {
            event.remove();
        })
        this.afterDestroy();
    }

    private initEvent() {
        //滑块拖动
        this.domObj.find(".slider").draggable({
            axis: "x",
            containment: this.domObj.find(".time-line"),
            drag: this.onSilderDrag.bind(this)
        });
        this.domObj.on("click", ".button-area", this.onPlayerButtonClick.bind(this))
            .on("click", ".line", this.onLineClick.bind(this));
        //this.domObj.find(".time-line").on("resize", this.onLineResize.bind(this));
        this.mapEvents.push(this.map.on("resize", this.onMapResize.bind(this)));
        $(this.AppX.appConfig.mainContainer).resize(function () {
            console.log("on-resized")
        })
    }

    private initPage() {
        this.domObj.find(".start-value").text(this.getTime(this.start_time));
        this.domObj.find(".end-value").text(this.getTime(this.end_time));
    }

    private onSilderDrag(event, ui) {
        if (this.isRunning) return;//播放状态，不允许使用滑块        
        this.updateCurrentValue();
        //更新轨迹
        this.snapToRoute(this.value);
    }

    /**
    * (方法说明)时间轴界面大小变化时，让滑块位置自动适应,没考虑动画播放时界面大小的变化影响
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private onMapResize(event) {
        var container: any = this.domObj.find(".time-line");
        var slider: any = this.domObj.find(".slider");
        var total = container.width() - slider.width();
        slider.css("left", this.value * total + "px");
    }

    /**
    * (方法说明)播放按钮单击处理函数
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private onPlayerButtonClick(event) {
        var iconDom = this.domObj.find(".button-area .glyphicon");
        if (iconDom.hasClass(this.class_play)) {
            iconDom.removeClass(this.class_play).addClass(this.class_pause);
            this.domObj.find(".button-area").attr("title", "暂停");
            this.playSlider();
            this.playRoute();
        }
        else if (iconDom.hasClass(this.class_pause)) {
            this.domObj.find(".slider").stop();
            this.pauseRoute();
            this.updateCurrentValue();
            iconDom.removeClass(this.class_pause).addClass(this.class_play);
            this.domObj.find(".button-area").attr("title", "播放");
        }
    }
    /**
    * (方法说明)单击时间轴时更新滑块位置和当前进度值
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private onLineClick(event) {
        if (this.isRunning) return;//播放状态，不允许使用滑块
        var page = this.getMousePos(event);
        var offset = this.domObj.find(".line").offset();
        //计算相对指定元素的位置
        var x = page.x - offset.left;
        var y = page.y - offset.top;
        this.domObj.find(".slider").css("left", x + "px");
        this.updateCurrentValue();
        this.snapToRoute(this.value);
    }

    private getMousePos(event) {
        var e = event || window.event;
        var scrollX = document.documentElement.scrollLeft || document.body.scrollLeft;//考虑对ie浏览器的兼容性
        var scrollY = document.documentElement.scrollTop || document.body.scrollTop;
        var x = e.pageX || e.clientX + scrollX;
        var y = e.pageY || e.clientY + scrollY;
        return { 'x': x, 'y': y };
    }


    /**
    * (方法说明)对滑块位置播放动画
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private playSlider() {
        if (this.value == 1) {
            this.domObj.find(".slider").css("left", "0px");
            this.value = 0;
        }
        var container: any = this.domObj.find(".time-line");
        var slider: any = this.domObj.find(".slider");
        var total = container.width() - slider.width();
        this.updateCurrentValue();
        var restTime = this.config.total_timespan * (1 - this.value);//可能在中部执行播放
        // slider.animate({ left: total }, 1000 * restTime, "linear", function () {
        //     this.value = 1;
        //     this.updateCurrentValue();
        //     var iconDom = this.domObj.find(".button-area .glyphicon");
        //     if (iconDom.hasClass(this.class_pause))
        //         iconDom.removeClass(this.class_pause).addClass(this.class_play);
        //     this.domObj.find(".button-area").attr("title", "播放");
        // }.bind(this));
        slider.animate({ left: total }, {
            duration: 1000 * restTime,
            easing: "linear",
            progress: function (ani, pro, remain) {
                this.updateCurrentValue();
            }.bind(this),
            complete: function () {
                this.value = 1;
                this.updateCurrentValue();
                var iconDom = this.domObj.find(".button-area .glyphicon");
                if (iconDom.hasClass(this.class_pause))
                    iconDom.removeClass(this.class_pause).addClass(this.class_play);
                this.domObj.find(".button-area").attr("title", "播放");
            }.bind(this)
        })
    }

    /**
    * (方法说明)获取滑块经度值
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private updateCurrentValue() {
        var container: any = this.domObj.find(".time-line");
        var slider: any = this.domObj.find(".slider");
        var total = container.width() - slider.width();
        //注意取值与slider.position().left不同?
        this.value = parseInt(slider.css("left")) / total;
        var currentTime = new Date(this.start_time.getTime() + (this.end_time - this.start_time) * this.value);
        slider.attr("title", this.getTime(currentTime));
    }

    /**
    * (方法说明)获取日期的时间部分
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private getTime(datetime) {
        var type = typeof datetime;
        if (type == 'string') {
            datetime = new Date(datetime);
        }
        return this.padLeft(datetime.getHours(), 2, 0) + ":" + this.padLeft(datetime.getMinutes(), 2, 0) + ":" + this.padLeft(datetime.getSeconds(), 2, 0);
    }

    /**
    * (方法说明)在value上用pad补齐total位数值
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    padLeft(value, total, pad) {
        return (Array(total).join(pad || 0) + value).slice(-total);
    }

    /**
    * (方法说明)重写窗体级高性能动画方法
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private initAmationFunction() {
        (function () {
            var lastTime = 0;
            var vendors = ['webkit', 'moz'];
            for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
                window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
                window.cancelAnimationFrame =
                    window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
            }

            if (!window.requestAnimationFrame)
                window.requestAnimationFrame = function (callback) {
                    var currTime = new Date().getTime();
                    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                    var id = window.setTimeout(function () { callback(currTime + timeToCall); },
                        timeToCall);
                    lastTime = currTime + timeToCall;
                    return id;
                };

            if (!window.cancelAnimationFrame)
                window.cancelAnimationFrame = function (id) {
                    clearTimeout(id);
                };
        } ());
    }

    private playSlider2() {
        if (this.value == 1) {
            this.domObj.find(".slider").css("left", "0px");
            this.value = 0;
        }
        this.updateCurrentValue();
        this.id = window.requestAnimationFrame(this.animation.bind(this));
    }
    id = null;
    start = null;
    private animation(timestamp) {
        if (this.start === null) this.start = timestamp;
        var container: any = this.domObj.find(".time-line");
        var slider: any = this.domObj.find(".slider");
        var total = container.width() - slider.width();
        var offsetValue = Math.floor(total * ((timestamp - this.start) / 10000));
        slider.css("left", offsetValue + "px");
        this.id = window.requestAnimationFrame(this.animation.bind(this));
        if ((timestamp - this.start) >= 10000) {
            window.cancelAnimationFrame(this.id);
            slider.css("left", "0px");
            this.start = null;
        }
    }
    /**
    * (方法说明)播放轨迹
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private playRoute() {
        if (this.tour == null)
            this.tour = new Tour({
                map: this.map,
                data: this.gpsdata,
                timefield: this.config.timefield,
                xfield: this.config.xfield,
                yfield: this.config.yfield,
                timegap: this.config.timegap,
                option: this.option,
                networkfield: this.config.networkfield,
                gpsfield: this.config.gpsfield,
                callback: this.onRoutePlayCompleted.bind(this)
            });
        // this.tour.animate();
        this.tour.animateWithPlan(this.start_time, this.end_time, this.config.total_timespan, this.value);//Date("2017-09-20 10:02:10")
        this.isRunning = true;
    }

    /**
    * (方法说明)播放轨迹
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private pauseRoute() {
        if (this.tour != null) {
            this.tour.pause();
        }
        this.isRunning = false;
    }
    /**
    * (方法说明)显示指定进度的画面
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private snapToRoute(value) {
        if (this.tour == null)
            this.tour = new Tour({
                map: this.map,
                data: this.gpsdata,
                timefield: this.config.timefield,
                xfield: this.config.xfield,
                yfield: this.config.yfield,
                timegap: this.config.timegap,
                option: this.option,
                networkfield: this.config.networkfield,
                gpsfield: this.config.gpsfield,
                callback: this.onRoutePlayCompleted.bind(this)
            });
        this.tour.initPlan(this.start_time, this.end_time, 10);
        this.tour.snapTo(value);
    }

    /**
    * (方法说明)轨迹数据预处理：构建日期，构建轨迹状态
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private parseRoute() {
        var paths = [];
        if (this.tour != null) {
            var status = this.tour.getStatus();
            var timgappath = status.timgappath;
            var alltime = this.end_time - this.start_time;
            for (var i = 0; i < timgappath.length; i++) {
                if (timgappath[i].status)
                    paths.push(
                        {
                            left: (this.gpsdata[timgappath[i].startindex][this.config.timefield] - this.start_time) / alltime,
                            width: (this.gpsdata[timgappath[i].endindex][this.config.timefield] - this.gpsdata[timgappath[i].startindex][this.config.timefield]) / alltime,
                            status: timgappath[i].status
                        }
                    );
            }
            //获取异常信息
            var statuspath = status.statuspath;
            for (var j = 0; j < statuspath.length; j++) {
                if (!statuspath[j].isvalid)
                    paths.push(
                        {
                            left: (this.gpsdata[statuspath[j].startindex][this.config.timefield] - this.start_time) / alltime,
                            width: statuspath[j].startindex == statuspath[j].endindex ? 0.01 : (this.gpsdata[statuspath[j].endindex][this.config.timefield] - this.gpsdata[statuspath[j].startindex][this.config.timefield]) / alltime,
                            status: statuspath[j].isvalid,
                            tip: statuspath[j].startindex == statuspath[j].endindex ? "异常点:<" + statuspath[j].message + ">" + this.getTime(this.gpsdata[statuspath[j].startindex][this.config.timefield]) :
                                "异常时段:<" + statuspath[j].message + ">" + this.getTime(this.gpsdata[statuspath[j].startindex][this.config.timefield]) + "-" + this.getTime(this.gpsdata[statuspath[j].endindex][this.config.timefield])
                        }
                    );
            }
            //绘制时间轴上不同状态的时间条
            this.showTimelineStaus(paths);
        }
    }

    /**
    * (方法说明)绘制时间轴上不同状态的时间条
    * @method (方法名)
    * @for (所属类名)
    * @param {(参数类型)} (参数名) (参数说明)
    * @return {(返回值类型)} (返回值说明)
    */
    private showTimelineStaus(paths) {
        var lineTempalte = "<div class=\"<%=item_class%>\" style=\"left:<%=leftvalue%>;width:<%=widthvalue%>\">";
        var lineDom = this.domObj.find(".line");
        lineDom.empty();
        for (var i = 0; i < paths.length; i++) {
            var mixedTemplate = _.template(lineTempalte)({
                item_class: paths[i].status == 1 ? "online" : "offline",
                leftvalue: (paths[i].left * 100).toFixed(2) + "%",
                widthvalue: (paths[i].width * 100).toFixed(2) + "%"
            });
            if (paths[i].tip)
                $(mixedTemplate).appendTo(lineDom).attr("title", paths[i].tip)
            else
                $(mixedTemplate).appendTo(lineDom);
        }
    }

    isRunning = false;
    private onRoutePlayCompleted() {
        this.isRunning = false;
    }
}