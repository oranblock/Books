package net.ablibrary.local.net

data class NetworkResponse(
    val statusCode: Int,
    val body: String,
    val isSuccessful: Boolean = statusCode in 200..299
)

expect object NetworkClient {
    suspend fun post(
        url: String,
        headers: Map<String, String> = emptyMap(),
        body: String = ""
    ): NetworkResponse

    suspend fun get(
        url: String,
        headers: Map<String, String> = emptyMap()
    ): NetworkResponse
}
