// ==UserScript==
// @name         FreeStreams Live (FSL)
// @description  Watch videos in external player.
// @version      1.0.4
// @include      /^https?:\/\/(?:[^\.\/]*\.)*(?:showsport\.(?:xyz)|wikisport\.(?:se)|fiveyardlab\.(?:com)|livehdplay\.(?:ru)|olalivehdplay\.(?:ru)|poscitechs\.(?:shop)|freestreams-live1\.(?:com)|fsl-stream\.(?:im))\/.*$/
// @icon         https://a.fsl-stream.im/favicon.ico
// @run-at       document-end
// @grant        unsafeWindow
// @homepage     https://github.com/warren-bank/crx-FreeStreamsLive/tree/webmonkey-userscript/es5
// @supportURL   https://github.com/warren-bank/crx-FreeStreamsLive/issues
// @downloadURL  https://github.com/warren-bank/crx-FreeStreamsLive/raw/webmonkey-userscript/es5/webmonkey-userscript/FreeStreamsLive.user.js
// @updateURL    https://github.com/warren-bank/crx-FreeStreamsLive/raw/webmonkey-userscript/es5/webmonkey-userscript/FreeStreamsLive.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// ----------------------------------------------------------------------------- constants

var user_options = {
  "webmonkey": {
    "post_intent_redirect_to_url":  "about:blank"
  },
  "greasemonkey": {
    "redirect_to_webcast_reloaded": true,
    "force_http":                   true,
    "force_https":                  false
  }
}

// ----------------------------------------------------------------------------- state

var state = {
  "current_window":               null
}

// ----------------------------------------------------------------------------- URL links to tools on Webcast Reloaded website

var get_webcast_reloaded_url = function(video_url, vtt_url, referer_url, force_http, force_https) {
  referer_url = referer_url ? referer_url : (referer_url === false) ? false : unsafeWindow.location.href
  force_http  = (typeof force_http  === 'boolean') ? force_http  : user_options.greasemonkey.force_http
  force_https = (typeof force_https === 'boolean') ? force_https : user_options.greasemonkey.force_https

  var encoded_video_url, encoded_vtt_url, encoded_referer_url, webcast_reloaded_base, webcast_reloaded_url

  encoded_video_url     =               encodeURIComponent(encodeURIComponent(btoa(video_url)))
  encoded_vtt_url       = vtt_url     ? encodeURIComponent(encodeURIComponent(btoa(vtt_url)))     : null
  encoded_referer_url   = referer_url ? encodeURIComponent(encodeURIComponent(btoa(referer_url))) : null

  webcast_reloaded_base = {
    "https": "https://warren-bank.github.io/crx-webcast-reloaded/external_website/index.html",
    "http":  "http://webcast-reloaded.surge.sh/index.html"
  }

  webcast_reloaded_base = (force_http)
                            ? webcast_reloaded_base.http
                            : (force_https)
                               ? webcast_reloaded_base.https
                               : (video_url.toLowerCase().indexOf('http:') === 0)
                                  ? webcast_reloaded_base.http
                                  : webcast_reloaded_base.https

  webcast_reloaded_url  = webcast_reloaded_base + '#/watch/' + encoded_video_url + (encoded_vtt_url ? ('/subtitle/' + encoded_vtt_url) : '') + (encoded_referer_url ? ('/referer/' + encoded_referer_url) : '')

  return webcast_reloaded_url
}

// ----------------------------------------------------------------------------- URL redirect

var redirect_to_url = function(url) {
  if (!url) return

  if (typeof GM_loadUrl === 'function') {
    if (typeof GM_resolveUrl === 'function')
      url = GM_resolveUrl(url, unsafeWindow.location.href) || url

    GM_loadUrl(url, 'Referer', unsafeWindow.location.href)
  }
  else {
    try {
      unsafeWindow.top.location = url
    }
    catch(e) {
      unsafeWindow.window.location = url
    }
  }
}

var process_webmonkey_post_intent_redirect_to_url = function() {
  var url = null

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'string')
    url = user_options.webmonkey.post_intent_redirect_to_url

  if (typeof user_options.webmonkey.post_intent_redirect_to_url === 'function')
    url = user_options.webmonkey.post_intent_redirect_to_url()

  if (typeof url === 'string')
    redirect_to_url(url)
}

var process_video_url = function(video_url, video_type, vtt_url, referer_url) {
  if (!referer_url)
    referer_url = (referer_url === false) ? false : unsafeWindow.location.href

  if (typeof GM_startIntent === 'function') {
    // running in Android-WebMonkey: open Intent chooser

    var args = [
      /* action = */ 'android.intent.action.VIEW',
      /* data   = */ video_url,
      /* type   = */ video_type
    ]

    // extras:
    if (vtt_url) {
      args.push('textUrl')
      args.push(vtt_url)
    }
    if (referer_url) {
      args.push('referUrl')
      args.push(referer_url)
    }

    GM_startIntent.apply(this, args)
    process_webmonkey_post_intent_redirect_to_url()
    return true
  }
  else if (user_options.greasemonkey.redirect_to_webcast_reloaded) {
    // running in standard web browser: redirect URL to top-level tool on Webcast Reloaded website

    redirect_to_url(get_webcast_reloaded_url(video_url, vtt_url, referer_url))
    return true
  }
  else {
    return false
  }
}

var process_hls_url = function(hls_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ hls_url, /* video_type= */ 'application/x-mpegurl', vtt_url, referer_url)
}

var process_dash_url = function(dash_url, vtt_url, referer_url) {
  process_video_url(/* video_url= */ dash_url, /* video_type= */ 'application/dash+xml', vtt_url, referer_url)
}

// ----------------------------------------------------------------------------- iframe management

var get_iframe = function() {
  return
    state.current_window.document.querySelector('iframe[src*="wikisport.se"]')     ||
    state.current_window.document.querySelector('iframe[src*="fiveyardlab.com"]')  ||
    state.current_window.document.querySelector('iframe[src*="livehdplay.ru"]')    ||
    state.current_window.document.querySelector('iframe[src*="olalivehdplay.ru"]') ||
    state.current_window.document.querySelector('iframe[src*="poscitechs.shop"]')  ||
    state.current_window.document.querySelector('iframe[src*="showsport.xyz"]')
}

var get_iframe_url = function(iframe) {
  if (!iframe)
    iframe = get_iframe()

  return iframe ? iframe.getAttribute('src') : null
}

var redirect_to_iframe = function() {
  var iframe_url = get_iframe_url()

  if (iframe_url)
    GM_loadFrame(iframe_url, iframe_url)
}

var recurse_into_iframe = function() {
  var iframe, recurse

  recurse = true

  while (recurse) {
    iframe = get_iframe()

    if (!iframe) {
      recurse = false
      break
    }

    state.current_window = iframe.contentWindow.window
    recurse              = process_live_videostream() !== true
  }
}

// ----------------------------------------------------------------------------- process video within iframe

var process_live_videostream = function() {
  var regex, scripts, script, encoded_video_url, offset_index, video_url

  regex = {
    whitespace:       /[\r\n\t]+/g,
    video_url_1:      /^.*['"](http[^'"]+\.m3u8)['"].*$/,
    video_url_2:      /^.*window\.atob\s*\(\s*['"]([^'"]+)['"]\s*\).*$/,
    video_url_3:      /^.*(\["h","t","t","p",[^\]]+\])\.join.*$/
  }

  scripts = state.current_window.document.querySelectorAll('script:not([src])')

  for (var i=0; i < scripts.length; i++) {
    script = scripts[i]
    script = script.innerHTML
    script = script.replace(regex.whitespace, ' ')

    if (regex.video_url_1.test(script)) {
      video_url = script.replace(regex.video_url_1, '$1')
      break
    }

    if (regex.video_url_2.test(script)) {
      encoded_video_url = script.replace(regex.video_url_2, '$1')

      try {
        encoded_video_url = unsafeWindow.atob(encoded_video_url)
        offset_index      = encoded_video_url.toLowerCase().lastIndexOf('http')

        if (offset_index === -1)
          continue
        if (offset_index === 0)
          video_url = encoded_video_url
        else
          video_url = unsafeWindow.decodeURIComponent( encoded_video_url.substring(offset_index, encoded_video_url.length) )
      }
      catch(e) {}
      break
    }

    if (regex.video_url_3.test(script)) {
      encoded_video_url = script.replace(regex.video_url_3, '$1')

      try {
        encoded_video_url = unsafeWindow.JSON.parse(encoded_video_url)
        encoded_video_url = encoded_video_url.join('')
        encoded_video_url = encoded_video_url.replace('////', '//')

        video_url = encoded_video_url
      }
      catch(e) {}
      break
    }
  }

  if (!video_url)
    return false

  process_hls_url(video_url, false, false)
  return true
}

// ----------------------------------------------------------------------------- bootstrap

var init = function() {
  if (state.current_window !== null) return
  state.current_window = unsafeWindow.window

  var hostname        = unsafeWindow.location.hostname
  var is_inner_iframe =
    (hostname.indexOf('wikisport.se')     >= 0) ||
    (hostname.indexOf('fiveyardlab.com')  >= 0) ||
    (hostname.indexOf('livehdplay.ru')    >= 0) ||
    (hostname.indexOf('olalivehdplay.ru') >= 0) ||
    (hostname.indexOf('poscitechs.shop')  >= 0) ||
    (hostname.indexOf('showsport.xyz')    >= 0)
  var is_outer_frame  = !is_inner_iframe
  var is_webmonkey    = false

  if (typeof GM_getUrl === 'function') {
    is_webmonkey      = true

    var initial_url   = unsafeWindow.location.href
    var current_url   = GM_getUrl()

    if (initial_url !== current_url) return
  }

  if (is_outer_frame && is_webmonkey) {
    redirect_to_iframe()
    return
  }

  if (is_inner_iframe) {
    if (!process_live_videostream() && is_webmonkey) {
      recurse_into_iframe()
    }
    return
  }
}

init()

// -----------------------------------------------------------------------------
