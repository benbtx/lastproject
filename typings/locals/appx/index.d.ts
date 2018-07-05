declare var AppX;

interface AppX {
    // 当前 url 中的根目录
    //  比如 localhost:3000/WebAppFrame
    root?: string,

    // 应用配置
    //  此配置为应用中 [只读] 的属性项
    //  和下面 runtimeConfig 不同的是,runtimeConfig中的内容是运行过程中逐步构建起来的
    appConfig: AppConfig,

    // 运行时配置
    //  用于存放运行时建立的全局变量、全局对象等
    runtimeConfig?: RuntimeConfig,

    // dojo 配置
    //  用于存放 Dojo 相关的配置项
    dojoConfig?: DojoConfig
}

interface AppConfig {
    title?: string,
    subtitle?: string,
    version?: string,
    mainContainer?: string,
    restService?: string,
    initextent?: Extent,
    apiroot?: string,
    apirootx?: string,
    usertoken?: string,
    xjapiroot?: string,
    xjxj?: string,
    range?: string,
    groupid?: string,
    departmentid?: string
    // 以下组件会第一时间加载
    // 此类组件会带有 onstarted() 函数,
    // 
    loadOnStartWidgets?: Array<{
        name?: string,
        discription?: string,
        url?: string,
        main?: string,
        configPath?: string,
        templatePath?: string,
        depend?: string
    }>,
    // 以下组件不会第一时间加载
    // 当在menuBar 中选择对应的模块时才会自动加载
    //
    menuBarWidgets: Array<{
        id: string,
        label: string,
        icon?: string,
        data: Array<{
            id: string,
            label: string,
            widget: string,
            main?: string,
            icon: string,
            inPanel: boolean
        }>
    }>,
    gisResource: {
        raster: GISItem,
        terrain: GISItem,
        poi: GISItem,
        grid: GISItem,
        privateterrain: GISItem,
        pipe: GISItem,
        zhuantitu: GISItem,
        scada: GISItem,
        geometry: GISItem,
        apiburstpipe: GISItem,
        apiconnectedpipe: GISItem,
        apipipepath: GISItem,
        apiscada: GISItem,
        vectorprint: GISItem,
        rasterprint: GISItem,
        printtemplatepath: GISItem,
        xzqmap: GISItem,
        fangdamap: GISItem,
        pipedata: GISItem,
        region_map: GISItem
    }

}
interface GISItem {
    name: string,
    groupname: string,
    type: string,
    config: Array<GISItemConfig>
}

interface GISItemConfig {
    name: string,
    groupname: string,
    url: string
}
interface RuntimeConfig {
    map?: any,
    toast?: WidgetToast,
    popup?: WidgetPopup,
    photowall?: WidgetPhotoWall,
    SideMenu?: WidgetSideMenu,
    dataPanel?: WidgetDataPanel,
    loadMask?: WidgetLoadMask,
    fieldConfig?: WidgetFieldConfig,
    unit?: string,
    loadWait?: WidgetLoadWait,
    routeplayer: RoutePlayer
}

interface Extent {
    xmin?: number,
    ymin?: number,
    xmax?: number,
    ymax?: number
}

interface DojoConfig {
    packages?: Array<{
        name?: string,
        location?: string
    }>
}

/** Widget */
interface WidgetFieldConfig {
    GetLayerFields(layername: string): LayerFieldInfo,
    Reload(),
}

interface LayerFieldInfo {
    layerdbname?: string,
    layername?: string,
    objectid: boolean,
    fields?: Array<any>,
}

interface WidgetDataPanel {
    Fold(),
    fold(),
    Unfold(),
    unfold(),
    Close(),
    close(),
    Show(souceData: any),
    show(souceData: any),
    ShowPage(sourceData: any),
    showPage(sourceData: any)
}

interface WidgetLoadMask {
    Show(message?: string),
    Hide()
}

interface WidgetLoadWait {
    Show(message?: string, dom?: any),
    Hide()
}

interface RoutePlayerOption {
    userlinecolor?: string,//人巡轨迹颜色，16进制字符串
    carlinecolor?: string,//车巡轨迹颜色
    playpointcolor?: string,//播放轨迹点颜色
    playlinecolor?: string,//播放轨迹线颜色
    pointsieze?: number,//轨迹点大小
    linezise?: number//轨迹线宽度
}

interface RoutePlayer {
    Show(gpsdata: Array<any>, options?: RoutePlayerOption),
    Hide()
}

interface WidgetToast {
    Show(message?: string)
}
interface WidgetPopup {
    Show(message?: string)
}
interface WidgetPhotoWall {
    Show(message?: string)
}
interface WidgetSideMenu {

}
