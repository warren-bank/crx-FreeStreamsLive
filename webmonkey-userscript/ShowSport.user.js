// ==UserScript==
// @name         ShowSport.xyz
// @description  Watch videos in external player.
// @version      1.0.0
// @match        *://showsport.xyz/*
// @match        *://*.showsport.xyz/*
// @match        *://freestreams-live1.com/*
// @match        *://*.freestreams-live1.com/*
// @icon         http://fans.freestreams-live1.com/favicon.ico
// @run-at       document-end
// @grant        unsafeWindow
// @homepage     https://github.com/warren-bank/crx-ShowSport/tree/webmonkey-userscript/es5
// @supportURL   https://github.com/warren-bank/crx-ShowSport/issues
// @downloadURL  https://github.com/warren-bank/crx-ShowSport/raw/webmonkey-userscript/es5/webmonkey-userscript/ShowSport.user.js
// @updateURL    https://github.com/warren-bank/crx-ShowSport/raw/webmonkey-userscript/es5/webmonkey-userscript/ShowSport.user.js
// @namespace    warren-bank
// @author       Warren Bank
// @copyright    Warren Bank
// ==/UserScript==

// ----------------------------------------------------------------------------- constants

var user_options = {
  "redirect_to_webcast_reloaded": true,
  "force_http":                   true,
  "force_https":                  false
}

// ----------------------------------------------------------------------------- URL links to tools on Webcast Reloaded website

var get_webcast_reloaded_url = function(video_url, vtt_url, referer_url, force_http, force_https) {
  referer_url = referer_url ? referer_url : (referer_url === false) ? false : unsafeWindow.location.href
  force_http  = (typeof force_http  === 'boolean') ? force_http  : user_options.force_http
  force_https = (typeof force_https === 'boolean') ? force_https : user_options.force_https

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
      url = GM_resolveUrl(url, unsafeWindow.location.href)

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
    return true
  }
  else if (user_options.redirect_to_webcast_reloaded) {
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

// ----------------------------------------------------------------------------- redirect to iframe

var redirect_to_iframe = function() {
  var iframe, iframe_url

  iframe = unsafeWindow.document.querySelector('iframe[src*="showsport.xyz"]')

  if (!iframe)
    return

  iframe_url = iframe.getAttribute('src')
  GM_loadFrame(iframe_url, iframe_url)
}

// ----------------------------------------------------------------------------- process video within iframe

var process_live_videostream = function() {
  var regex, scripts, script, encoded_video_url, video_url

  regex = {
    whitespace:       /[\r\n\t]+/g,
    video_url:        /^.*window\.atob\s*\(\s*['"]([^'"]+)['"]\s*\).*$/,
    video_url_prefix: /^https?:\/\/jsonp\.afeld\.me\/\?url=(.+)$/i
  }

  scripts = unsafeWindow.document.querySelectorAll('script:not([src])')

  for (var i=0; i < scripts.length; i++) {
    script = scripts[i]
    script = script.innerHTML
    script = script.replace(regex.whitespace, ' ')

    if (regex.video_url.test(script)) {
      encoded_video_url = script.replace(regex.video_url, '$1')

      try {
        encoded_video_url = unsafeWindow.atob(encoded_video_url)

        if (regex.video_url_prefix.test(encoded_video_url)) {
          encoded_video_url = encoded_video_url.replace(regex.video_url_prefix, '$1')
          video_url         = unsafeWindow.decodeURIComponent(encoded_video_url)
        }
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
  var hostname        = unsafeWindow.location.hostname
  var is_inner_iframe = (hostname.indexOf('showsport.xyz') >= 0)
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
      redirect_to_iframe()
    }
    return
  }
}

init()

// -----------------------------------------------------------------------------
