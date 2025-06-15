import NativeInterface from "./NativeInterface";

const Mic = {
    checkPermission: function (cb) {
        console.log("wrapper in")
        NativeInterface?.checkPermission(cb)
    },
    test: function () {
        console.log("test in")
        NativeInterface?.test()
    },
    startMeasure: function (tone) {
        console.log("measure start wrapper in mic")
        NativeInterface?.measureStart(tone)
    },
    stopMeasure: function () {
        console.log("measure stop call")
        NativeInterface?.measureStop()
    },
    lock_in: function (order, cb) {
        NativeInterface?.confirmed(order, cb)
    },
    play_sample_sound: function (tone) {
        console.log("play_sample_sound wrapper " + tone)
        NativeInterface?.playSample(tone)
    },
    stop_sample_sound: function () {
        console.log("stop_sample_sound wrapper ")
        NativeInterface?.stopSample()
    }
}

export default Mic