# 📌 Money Transfer Automation (Malay–Myanmar)

This project automates the process of recording **transaction details** into Google Sheets using **Google Forms** and **Google Apps Script**. It also integrates with **Discord** and **Telegram** via webhooks to send real-time notifications whenever a transaction is submitted or updated.

---

## 🚀 Features
- Automated saving of transaction records into Google Sheets  
- Google Form frontend for transaction submission  
- Google Apps Script backend for handling form data and triggers  
- Webhook integration with **Discord** and **Telegram** for instant notifications  
- Support for transaction updates (edit/completion) with notification alerts  
- Receipt storage in Google Drive via folder ID configuration  

---

## 📂 Repository Files
- **`code.gs`** → Core Apps Script logic for handling form submissions, edits, and webhook calls  
- **`form.html`** → Custom HTML form template for transaction input  
- **`appsscript.json`** → Manifest file for Apps Script project configuration  
- **`README.md`** → Documentation (this file)  

---

## ⚙️ Setup Instructions
Follow these steps to set up the automation:

1. **Open Google Sheet**  
  - Go to the **Extensions** tab → **Apps Script Editor**

2. **Copy Code Files**  
  - Paste the contents of `code.gs` into the editor's `code.gs` file  
  - Create a new file named `form.html` and paste the contents of `form.html`  
  - Enable manifest visibility:  
    - Go to **Project Settings** (left nav bar)  
    - Check **"Show appsscript.json manifest file in editor"**  
    - Copy and paste the contents of `appsscript.json`  

3. **Configure Trigger**  
  - Navigate to **Triggers** (left nav bar)  
  - Add a new trigger with the following parameters:  
    - Function: `onEdit`  
    - Event Source: **From spreadsheet**  
    - Event Type: **On edit**  

4. **Deploy as Web App**  
  - Save all changes  
  - Deploy the project as a **Web App**  
  - ⚠️ Reminder: If you create a new deployment, update the `action` parameter in the `<form>` tag inside `form.html` to the new Web App URL  

---

## 🔗 Webhook Configuration
- **`formWebhookUrl`** (inside `code.gs`) → Discord webhook URL for saving records  
- **`editWebhookUrl`** (inside `code.gs`) → Discord webhook URL for edit notifications  
- **Telegram Integration** → Add your Telegram webhook URL in the same manner  

---

## 📁 Receipt Storage
- Create a folder in Google Drive  
- Copy its **Folder ID**  
- Paste it into the `RECEIPT_FOLDER_ID` variable in `code.gs`  

---

## 📝 Important Notes
- Ensure the **Google Sheet's column header row (Row 1)** matches exactly with the expected format  
- Always update the form action URL when redeploying the Web App  
- Webhooks must be correctly configured to receive notifications  

---

## 📖 About
Malay–Myanmar money transfer automation through Google Form and Google Sheets using Apps Script  

---

## 🎥 Demo Video
▶️ Watch here: https://drive.google.com/file/d/1Pt4XWK4wVEx1iF0cr_R5Q3qF_amh1ya0/view?usp=sharing





