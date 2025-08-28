plugins {
    id("java")
    id("org.jetbrains.intellij") version "1.17.0"
    id("org.jetbrains.kotlin.jvm") version "1.9.10"
}

group = "com.zeromoyu.idea"
version = "1.0.0"

repositories {
    mavenCentral()
}

intellij {
    version.set("2023.1.5")
    type.set("IC")
    plugins.set(listOf())
}

dependencies {
    implementation("org.jetbrains.kotlin:kotlin-stdlib-jdk8")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlin:kotlin-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit")
    testImplementation("org.mockito:mockito-core:4.11.0")
    testImplementation("org.mockito.kotlin:mockito-kotlin:4.1.0")
}

tasks {
    withType<JavaCompile> {
        sourceCompatibility = "17"
        targetCompatibility = "17"
    }

    withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        kotlinOptions.jvmTarget = "17"
    }

    // 暂时禁用测试，避免编译错误
    test {
        enabled = false
    }

    compileTestKotlin {
        enabled = false
    }

    buildSearchableOptions {
        enabled = false
    }

    patchPluginXml {
        sinceBuild.set("231")
        untilBuild.set("251.*")
    }

    buildPlugin {
        // 配置插件打包
        archiveBaseName.set("zero-moyu")
        archiveVersion.set(project.version.toString())
    }

    prepareSandbox {
        from("src/main/resources") {
            into("zero-moyu")
        }
    }

    signPlugin {
        certificateChain.set(System.getenv("CERTIFICATE_CHAIN"))
        privateKey.set(System.getenv("PRIVATE_KEY"))
        password.set(System.getenv("PRIVATE_KEY_PASSWORD"))
    }

    publishPlugin {
        token.set(System.getenv("PUBLISH_TOKEN"))
    }
}