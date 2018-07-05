/**
 * 此为所有 Widget 类型控件的基类
 * 
 * 其中包含了每个 Widget 所需的基础元素
 * 
 * 如：变量、生命周期函数、初始化函数
 */

import Base = require('core/Base.class');
import Functions = require('core/Functions.module');

export = BaseWidget;

class BaseWidget extends Base {
    // type: String
    //      控件类型,值应为 widget
    type = 'widget';

    /**** 以下属性都能在根目录 config 文件中进行配置 ****/
    // id: String
    //      控件的唯一 id,如果没有设置,系统将自动为其设置
    id: string;
    AppX: AppX;
    root: string;
    domObj = $();
    label: string;
    icon: string;
    uri: string;
    config: any;
    appConfig: any;
    folderUrl: string;
    started = false;
    name: string;
    baseClass: string;
    template: string;
    widgetPath: string;
    configPath?: string;
    templatePath?: string;
    readyCallback?: Function;
    panelSelector?: string;
    afterDestroyCallback?: Function;

    /*** 生命周期方法 ***/

    constructor(settings: {
        widgetPath: string,
        configPath?: string,
        templatePath?: string,
        panelSelector?: string,
        readyCallback?: Function,
        afterDestroyCallback?: Function
    }) {
        super();
        // 使用 settings
        //      设置当前控件的位置 url
        this.widgetPath ? null : this.widgetPath = settings.widgetPath;
        this.configPath = settings.configPath || undefined;
        this.templatePath = settings.templatePath || undefined;
        this.panelSelector = settings.panelSelector || undefined;
        this.readyCallback = settings.readyCallback || undefined;
        this.afterDestroyCallback = settings.afterDestroyCallback || undefined;

        // 设置全局配置项
        this.appConfig = this.AppX.appConfig || {};

        // 将当前模块样式表加载进页面
        this.setStyle();
        // 设置配置文件,之后在模块内任意位置用 this.config 进行访问
        // 成功获得配置文件后,将会调用 startup启动应用
        this.initConfig({
            configPath: this.configPath
        }, function () {
            this.initTemplate({
                templatePath: this.templatePath
            }, function () {
                this._init();
            });
        });

    }

    // 用于模块初始化,不允许子类调用
    protected _init() {
        this.startup();
        this.ready();
    }

    // 初始化完成自动调用该函数
    startup() {

    }

    // 在当前模块准备完成时,通知调用模块
    ready() {
        var callback = this.readyCallback;

        this.readyCallback = null;

        if (callback) {
            callback();
        }
    }

    // 销毁自身创建的相关资源包含 Dom 对象等,但 不包含 样式文件及script文件(因为可能有其他模块在使用)
    public destroy() {
        super.destroy();
    }

    afterDestroy() {
        if (this.afterDestroyCallback) {
            this.afterDestroyCallback();
        }
    }

    /*** 配置项 ***/
    // 初始化配置文件
    // 即为通过 Ajax 异步加载配置文件
    initConfig(args: { configPath?: string }, callback: Function) {
        (function (that) {
            var url = Functions.concatUrl(that.widgetPath, args.configPath || "/config.json");
            $.ajax(url, {
                dataType: "json",
                success: function (data) {
                    that.config = data;
                    callback.call(that);
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    that.bug("获取" + url + "失败:" + textStatus);
                }
            });
        })(this);
    }

    // 初始化模板
    // 即为通过 Ajax 加载模板数据
    initTemplate(args: { templatePath?: string }, callback: Function) {
        (function (that) {
            var url = Functions.concatUrl(that.widgetPath, args.templatePath || "/Widget.html");
            $.ajax(url, {
                dataType: "text",
                success: function (data) {
                    that.template = data;
                    callback.call(that);
                },
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    that.bug("获取" + url + "失败:" + textStatus);
                }
            });
        })(this);
    }

    // 添加 style
    // 将 Style 以标签的方式添加进 Dom 文档。
    setStyle(url?: string) {
        var styleID = this.widgetPath.replace(/\//, "-") + "-css";
        if ($("#" + styleID).length > 0) {
            // 已经加载过
            return;
        }
        // 添加引用
        var linkTag = $('<link id="' + styleID + '" rel="stylesheet" href="' + (url || this.widgetPath + "/css/style.css") + '"/>');
        $($('head')[0]).append(linkTag);
    }

    // 公共的设置 HTML 函数
    // 将指定的 HTML 字符串添加到对应的 Dom 节点中
    // 默认节点为 body
    public setHtml(html: string, selector?: string) {
        var currentSelector = selector || this.panelSelector || this.config.panelSelector || this.AppX.appConfig.mainContainer
        if (currentSelector) {
            $(currentSelector).append(html);
        } else {
            $($('body')[0]).append(html);
        }

        this.setDomObj();
    }

    // 将添加好的节点缓存到本地变量
    setDomObj() {
        if (this.baseClass === undefined) {
            // this.bug('控件"' + this.widgetPath + '" 中未设置变量 "baseClass"!');
        } else {
            if (this.baseClass !== "") {
                this.domObj = $('.' + this.baseClass);
            }
        }
    }
}