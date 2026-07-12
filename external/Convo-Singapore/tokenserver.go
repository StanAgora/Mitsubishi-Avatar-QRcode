package main

import (
   // rtmtokenbuilder "github.com/AgoraIO/Tools/DynamicKey/AgoraDynamicKey/go/src/rtmtokenbuilder2"
    rtctokenbuilder "github.com/AgoraIO/Tools/DynamicKey/AgoraDynamicKey/go/src/rtctokenbuilder2"
    "fmt"
    "log"
    "net/http"
   // "time"
    "encoding/json"
    "errors"
    "strconv"
)

type rtm_token_struct struct{
    Uid_rtm string `json:"uid"`
    Rtc_channel string `json:"channel"`
}

var rtm_token string
var rtm_uid string
var rtc_channel string

// 使用 RtmTokenBuilder 来生成 RTM Token
func generateRtmToken(rtm_uid string, rtc_channel string){

    appID := "42a1ea66f900428b8a16454822c19f95"
    appCertificate := "fadc93f28b16423c8db40fd840a9b656"
    //role := rtctokenbuilder.RolePublisher
    // AccessToken2 过期的时间，单位为秒
    expireTimeInSeconds := uint32(36000)
    //currentTimestamp := uint32(time.Now().UTC().Unix())
    //expireTimestamp := currentTimestamp + expireTimeInSeconds

    result, err := rtctokenbuilder.BuildTokenWithRtm(appID, appCertificate,rtc_channel, rtm_uid, rtctokenbuilder.RolePublisher, expireTimeInSeconds, expireTimeInSeconds)
    if err != nil {
        fmt.Println(err)
    } else {
        fmt.Printf("Rtm Token: %s\n", result)

    rtm_token = result

    }
}

func rtmTokenHandler(w http.ResponseWriter, r *http.Request){
    w.Header().Set("Content-Type", "application/json;charset=UTF-8")
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS");
        w.Header().Set("Access-Control-Allow-Headers", "*");

        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }

        if r.Method != "POST" && r.Method != "OPTIONS" {
            http.Error(w, "Unsupported method. Please check.", http.StatusNotFound)
            return
        }


        var t_rtm_str rtm_token_struct
        var unmarshalErr *json.UnmarshalTypeError
        str_decoder := json.NewDecoder(r.Body)
        rtm_err := str_decoder.Decode(&t_rtm_str)

        if (rtm_err == nil) {
		rtm_uid = t_rtm_str.Uid_rtm
		rtc_channel = t_rtm_str.Rtc_channel
        }

        if (rtm_err != nil) {
            if errors.As(rtm_err, &unmarshalErr){
            errorResponse(w, "Bad request. Please check your params.", http.StatusBadRequest)
            } else {
            errorResponse(w, "Bad request.", http.StatusBadRequest)
        }
        return
    }

        generateRtmToken(rtm_uid,rtc_channel)
        errorResponse(w, rtm_token, http.StatusOK)
        log.Println(w, r)
}


func errorResponse(w http.ResponseWriter, message string, httpStatusCode int){
    w.Header().Set("Content-Type", "application/json")
    w.Header().Set("Access-Control-Allow-Origin", "*")
    w.WriteHeader(httpStatusCode)
    resp := make(map[string]string)
    resp["token"] = message
    resp["code"] = strconv.Itoa(httpStatusCode)
    jsonResp, _ := json.Marshal(resp)
    w.Write(jsonResp)

}

func main(){
    // 使用 int 型 uid 生成 RTM Token
    http.HandleFunc("/fetch_agora_token", rtmTokenHandler)

    fmt.Printf("Starting server at port 8082\n")

    if err := http.ListenAndServeTLS(":8082","server.pem","server.key", nil); err != nil {
        log.Fatal(err)
    }
}

