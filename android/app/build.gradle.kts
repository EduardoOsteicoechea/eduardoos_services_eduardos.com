plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.eduardoos.eeyes"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.eduardoos.eeyes"
        minSdk = 26
        targetSdk = 35
        versionCode = (System.getenv("EEYES_VERSION_CODE") ?: "1").toInt()
        versionName = System.getenv("EEYES_VERSION_NAME") ?: "1.0.0"
        buildConfigField("String", "EEYES_BASE_URL", "\"${System.getenv("EEYES_BASE_URL") ?: "https://eduardoos.com"}\"")
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    val releaseKeystorePath = System.getenv("EEYES_ANDROID_KEYSTORE_FILE")
    val hasReleaseKeystore = !releaseKeystorePath.isNullOrBlank()

    signingConfigs {
        if (hasReleaseKeystore) {
            create("release") {
                storeFile = file(releaseKeystorePath!!)
                storePassword = System.getenv("EEYES_ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("EEYES_ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("EEYES_ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Without CI keystore secrets, ship an unsigned release APK for publish/tests.
            if (hasReleaseKeystore) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.camera:camera-camera2:1.4.0")
    implementation("androidx.camera:camera-lifecycle:1.4.0")
    implementation("androidx.camera:camera-view:1.4.0")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    testImplementation("junit:junit:4.13.2")
}
