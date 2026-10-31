package net.ablibrary.local.net

import kotlinx.cinterop.BetaInteropApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.IO
import kotlinx.coroutines.withContext
import platform.Foundation.*

actual object NetworkClient {
    @OptIn(BetaInteropApi::class)
    actual suspend fun post(
        url: String,
        headers: Map<String, String>,
        body: String
    ): NetworkResponse = withContext(Dispatchers.IO) {
        try {
            val nsUrl = NSURL.URLWithString(url) ?: return@withContext NetworkResponse(0, "Invalid URL", false)
            val request = NSMutableURLRequest.requestWithURL(nsUrl)
            request.setHTTPMethod("POST")
            for ((k, v) in headers) {
                request.setValue(v, forHTTPHeaderField = k)
            }
            if (body.isNotEmpty()) {
                val nsData = (body as NSString).dataUsingEncoding(NSUTF8StringEncoding)
                request.setHTTPBody(nsData)
            }

            var responseCode = 200
            val data = NSData.dataWithContentsOfURL(nsUrl)
            val text = if (data != null) {
                NSString.create(data = data, encoding = NSUTF8StringEncoding)?.toString() ?: ""
            } else ""

            NetworkResponse(statusCode = responseCode, body = text, isSuccessful = true)
        } catch (e: Exception) {
            NetworkResponse(statusCode = 0, body = e.message ?: "Network error", isSuccessful = false)
        }
    }

    @OptIn(BetaInteropApi::class)
    actual suspend fun get(
        url: String,
        headers: Map<String, String>
    ): NetworkResponse = withContext(Dispatchers.IO) {
        try {
            val nsUrl = NSURL.URLWithString(url) ?: return@withContext NetworkResponse(0, "Invalid URL", false)
            val request = NSMutableURLRequest.requestWithURL(nsUrl)
            request.setHTTPMethod("GET")
            for ((k, v) in headers) {
                request.setValue(v, forHTTPHeaderField = k)
            }
            val data = NSData.dataWithContentsOfURL(nsUrl)
            val text = if (data != null) {
                NSString.create(data = data, encoding = NSUTF8StringEncoding)?.toString() ?: ""
            } else ""

            NetworkResponse(statusCode = 200, body = text, isSuccessful = true)
        } catch (e: Exception) {
            NetworkResponse(statusCode = 0, body = e.message ?: "Network error", isSuccessful = false)
        }
    }
}
