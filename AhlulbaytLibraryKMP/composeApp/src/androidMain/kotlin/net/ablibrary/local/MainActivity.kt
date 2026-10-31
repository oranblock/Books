package net.ablibrary.local

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import net.ablibrary.local.db.DatabaseDriverFactory

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        DatabaseDriverFactory.appContext = applicationContext
        super.onCreate(savedInstanceState)
        setContent { App() }
    }
}
