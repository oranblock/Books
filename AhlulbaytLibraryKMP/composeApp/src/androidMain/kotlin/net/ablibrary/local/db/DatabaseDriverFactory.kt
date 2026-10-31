package net.ablibrary.local.db

import android.content.Context
import app.cash.sqldelight.db.SqlDriver
import app.cash.sqldelight.driver.android.AndroidSqliteDriver

actual class DatabaseDriverFactory(private val context: Context? = null) {
    actual fun createDriver(): SqlDriver {
        val ctx = context ?: appContext ?: error("Android Context must be initialized via DatabaseDriverFactory.appContext")
        return AndroidSqliteDriver(AhlulbaytDatabase.Schema, ctx, "ahlulbayt_library.db")
    }

    companion object {
        var appContext: Context? = null
    }
}
