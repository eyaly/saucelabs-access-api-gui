# Sauce Labs Access API GUI

**This project provides a UI wrapper for the API commands documented in the official [Sauce Labs Real Device API](https://github.com/saucelabs/real-device-api) repository.**

This is a desktop application (built with Electron, React, and Vite) designed to provide a graphical user interface for interacting with the Sauce Labs Real Device Cloud (RDC) API. It simplifies common tasks such as managing device sessions, installing applications, taking screenshots, and interacting with Appium servers.

## Features

The application provides a "Device Actions" sidebar for a selected device, offering the following functionalities:

*   **Session ID Display & Copy:** Easily view and copy the current device session ID.
*   **Install App:**
    *   Install an application from a local path.
    *   Select and install an application directly from your Sauce Labs App Storage (supports `.apk`, `.aab` for Android and `.ipa` for iOS).
*   **Take Screenshot:** Capture a screenshot of the current device screen.
*   **Get Session Details:** Retrieve detailed information about the active device session.
*   **List App Installations:** List all applications installed on the device.
*   **Open a URL:** Open a specified URL in the device's default browser.
*   **Enable Local Device Access:**
    *   This feature sets up local device access, allowing you to run local Appium tests against a cloud device.
    *   For **Android**, it uses `websocat` to proxy ADB commands.
    *   For **iOS**, it uses a dynamically configured `Caddy` server (via Docker) to proxy WebDriverAgent (WDA) traffic.
    *   **Requires:** `SAUCE_USERNAME`, `SAUCE_ACCESS_KEY`, and `SAUCE_API_URL` environment variables to be set (or configured in app settings).
*   **Appium Server:**
    *   **Start Appium Server (POST):** Start a hosted Appium server on the Sauce Labs device with a specified Appium version (e.g., `latest`, `stable`, `1.22.3`).
    *   **Get Appium Server URL (GET):** Retrieve the status and URL of an existing hosted Appium server.
    *   **Appium Versions:** Refer to the [Sauce Labs Appium Versions documentation](https://docs.saucelabs.com/mobile-apps/automated-testing/appium/appium-versions/#real-devices) for available versions.
*   **Run ADB Shell Command (Android Only):** Execute arbitrary ADB shell commands on Android devices.
*   **Custom API Request:** A flexible interface to make direct GET or POST requests to Sauce Labs APIs, with options to specify the API path and request body.

## Getting Started

### Prerequisites

*   Node.js (version 20 recommended) and npm
*   For `Enable Local Device Access` on iOS: Docker must be installed and running.
*   For `Enable Local Device Access` on Android: `websocat` and `adb` must be installed.

### Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/saucelabs-access-api-gui.git
    cd saucelabs-access-api-gui
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start the application in development mode:**
    This will start both the React development server and the Electron main process.
    ```bash
    npm start
    ```

### Building and Releasing

The project uses `electron-builder` for creating distributable packages.

1.  **Build for macOS:**
    ```bash
    npm run build:mac
    ```
    This will generate a `.dmg` and `.zip` file in the `release` directory.

2.  **Build for Windows:**
    ```bash
    npm run build:win
    ```
    This will generate an executable installer in the `release` directory.

3.  **Automated Releases with GitHub Actions:**
    The project includes a GitHub Actions workflow (`.github/workflows/release.yml`) that automates the build and release process.
    *   **Trigger:** The workflow runs automatically when you push a new Git tag matching `v*.*.*` (e.g., `v1.0.0`).
    *   **Process:** It builds the application for macOS and Windows, then creates a new GitHub Release and uploads the generated installers as assets.
    *   **To trigger a release:**
        ```bash
        git tag -a v1.0.0 -m "First official release"
        git push origin v1.0.0
        ```
        (Replace `v1.0.0` with your desired version number.)

## Configuration

Your Sauce Labs credentials (username, access key, and region) can be configured within the application's settings. These are stored persistently using `electron-store`.

---

