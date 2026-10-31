pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "AhlulbaytLibraryKMP"
enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")
include(":composeApp")
