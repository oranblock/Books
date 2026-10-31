package net.ablibrary.local.net

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

actual object NetworkClient {
    actual suspend fun post(
        url: String,
        headers: Map<String, String>,
        body: String
    ): NetworkResponse = withContext(Dispatchers.IO) {
        var conn: HttpURLConnection? = null
        try {
            val u = URL(url)
            conn = u.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 25000
            conn.readTimeout = 40000
            conn.doOutput = true
            conn.doInput = true

            for ((k, v) in headers) {
                conn.setRequestProperty(k, v)
            }

            if (body.isNotEmpty()) {
                conn.outputStream.use { os ->
                    val bytes = body.toByteArray(Charsets.UTF_8)
                    os.write(bytes)
                    os.flush()
                }
            }

            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else (conn.errorStream ?: conn.inputStream)
            val responseText = BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { it.readText() }

            NetworkResponse(
                statusCode = code,
                body = responseText,
                isSuccessful = code in 200..299
            )
        } catch (e: Exception) {
            NetworkResponse(
                statusCode = 0,
                body = e.message ?: "Network error",
                isSuccessful = false
            )
        } finally {
            conn?.disconnect()
        }
    }

    actual suspend fun get(
        url: String,
        headers: Map<String, String>
    ): NetworkResponse = withContext(Dispatchers.IO) {
        var conn: HttpURLConnection? = null
        try {
            val u = URL(url)
            conn = u.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 25000
            conn.readTimeout = 40000
            conn.doInput = true

            for ((k, v) in headers) {
                conn.setRequestProperty(k, v)
            }

            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else (conn.errorStream ?: conn.inputStream)
            val responseText = BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { it.readText() }

            NetworkResponse(
                statusCode = code,
                body = responseText,
                isSuccessful = code in 200..299
            )
        } catch (e: Exception) {
            NetworkResponse(
                statusCode = 0,
                body = e.message ?: "Network error",
                isSuccessful = false
            )
        } finally {
            conn?.disconnect()
        }
    }
}
