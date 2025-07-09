// Handle HTTP POST requests from custom HTML form
function doPost(e) {
  // Constants
  const RECEIPT_FOLDER_ID = "13XWHd0cxQ0k6lQgrQ8vixOTtOHnmUWD_";
  
  try {
    // ULTRA DEBUG logging to see EVERYTHING we're receiving
    console.log("=== ULTRA DEBUG: doPost called ===");
    Logger.log("=== ULTRA DEBUG: doPost called ===");
    console.log("Raw e object keys: " + Object.keys(e || {}).join(", "));
    console.log("e.parameter exists: " + (e.parameter ? "YES" : "NO"));
    console.log("e.parameters exists: " + (e.parameters ? "YES" : "NO"));
    console.log("e.postData exists: " + (e.postData ? "YES" : "NO"));
    
    if (e.parameter) {
      console.log("e.parameter keys: " + Object.keys(e.parameter).join(", "));
    }
    if (e.parameters) {
      console.log("e.parameters keys: " + Object.keys(e.parameters).join(", "));
    }
    if (e.postData) {
      console.log("e.postData type: " + e.postData.type);
      console.log("e.postData length: " + (e.postData.contents ? e.postData.contents.length : "no contents"));
    }
    
    // Log ALL data we receive
    if (e.parameter) {
      Object.keys(e.parameter).forEach(key => {
        const value = e.parameter[key];
        if (typeof value === 'object' && value && typeof value.getSize === 'function') {
          try {
            console.log(`📎 FILE in e.parameter['${key}']: name="${value.getName()}", size=${value.getSize()}, type="${value.getContentType()}"`);
          } catch (fileError) {
            console.log(`📎 BLOB OBJECT in e.parameter['${key}'] but error accessing: ${fileError.toString()}`);
          }
        } else {
          console.log(`📝 DATA e.parameter['${key}']: ${typeof value === 'string' ? value.substring(0, 100) : `[${typeof value}] ${value}`}`);
        }
      });
    }
    
    if (e.parameters) {
      Object.keys(e.parameters).forEach(key => {
        const values = e.parameters[key];
        if (Array.isArray(values)) {
          values.forEach((value, index) => {
            if (typeof value === 'object' && value && typeof value.getSize === 'function') {
              try {
                Logger.log(`📎 FILE in e.parameters['${key}'][${index}]: name="${value.getName()}", size=${value.getSize()}, type="${value.getContentType()}"`);
              } catch (fileError) {
                Logger.log(`📎 BLOB OBJECT in e.parameters['${key}'][${index}] but error accessing: ${fileError.toString()}`);
              }
            } else {
              Logger.log(`📝 DATA e.parameters['${key}'][${index}]: ${typeof value === 'string' ? value.substring(0, 100) : `[${typeof value}] ${value}`}`);
            }
          });
        } else {
          Logger.log(`📝 SINGLE VALUE e.parameters['${key}']: ${typeof values === 'string' ? values.substring(0, 100) : `[${typeof values}] ${values}`}`);
        }
      });
    }
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Extract form data from POST request
    const formData = e.parameter;
    // Store file references for later processing
    let base64ImageUrl = "";

    // Handle file uploads - Base64 method only (exactly like sample code)
    // Method 1: Check for base64 encoded image data (single file)
    if (e.parameter && e.parameter.data) {
      console.log("📎 Found base64 image data (single file)");
      console.log("📎 Base64 data length: " + (e.parameter.data ? e.parameter.data.length : 0));
      console.log("📎 Image name: " + (e.parameter.filename || "no name"));
      console.log("📎 Image type: " + (e.parameter.mimetype || "no type"));
      try {
        base64ImageUrl = processBase64Upload(
          e.parameter.data, 
          e.parameter.mimetype, 
          e.parameter.filename
        );
        console.log(`📎 ====== BASE64 IMAGE PROCESSED SUCCESSFULLY ======`);
        console.log(`📎 Generated URL: ${base64ImageUrl}`);
      } catch (fileError) {
        console.log("📎 ❌ Error processing base64 image: " + fileError.toString());
        console.log("📎 ❌ Error stack: " + (fileError.stack || "No stack trace"));
      }
    } 
    // Method 2: Check for multiple base64 files (data_0, data_1, etc.)
    else {
      console.log("📎 Checking for multiple base64 files...");
      const uploadedUrls = [];
      let fileIndex = 0;
      
      // Check for numbered files (data_0, data_1, etc.)
      while (e.parameter[`data_${fileIndex}`]) {
        const data = e.parameter[`data_${fileIndex}`];
        const mimetype = e.parameter[`mimetype_${fileIndex}`];
        const filename = e.parameter[`filename_${fileIndex}`];
        
        console.log(`📎 Found base64 file ${fileIndex}: ${filename}, type: ${mimetype}, data length: ${data.length}`);
        
        try {
          const fileUrl = processBase64Upload(data, mimetype, filename);
          uploadedUrls.push(fileUrl);
          console.log(`📎 ✅ File ${fileIndex} processed successfully: ${fileUrl}`);
        } catch (fileError) {
          console.log(`📎 ❌ Error processing file ${fileIndex}: ${fileError.toString()}`);
        }
        
        fileIndex++;
      }
      
      if (uploadedUrls.length > 0) {
        base64ImageUrl = uploadedUrls.join(", ");
        console.log(`📎 ====== ${uploadedUrls.length} BASE64 FILES PROCESSED SUCCESSFULLY ======`);
        console.log(`📎 Generated URLs: ${base64ImageUrl}`);
      } else {
        console.log("📎 ⚠️ No base64 image data found");
        console.log("📎 e.parameter.data exists: " + (e.parameter && e.parameter.data ? "YES" : "NO"));
      }
    }
    
    // Method 3: Legacy - Check e.parameter.receiptImage (single file upload)
    if (!base64ImageUrl && e.parameter.receiptImage) {
      if (typeof e.parameter.receiptImage === 'object' && e.parameter.receiptImage.getSize) {
        if (e.parameter.receiptImage.getSize() > 0) {
          console.log(`📎 Found legacy file in e.parameter: ${e.parameter.receiptImage.getName()}, size: ${e.parameter.receiptImage.getSize()}`);
          // Handle legacy file upload if needed - for now just log
          console.log("📎 ⚠️ Legacy file upload detected but not processed (use base64 method instead)");
        }
      }
    }

    // Generate unique ID for new transaction
    const timestamp = new Date();
    
    // Add new row to sheet first to get the row number
    const rowData = [
      "",                                 // Column A: ID_Number (will be updated after getting row number)
      formData.Propose_Date || "",        // Column B: Propose Date  
      formData.BG || "",                  // Column C: Business Group
      formData.MM_Bank || "",             // Column D: Myanmar Bank
      formData.Bank_Branch || "",         // Column E: Bank Branch
      formData.Bank_Acc_No || "",         // Column F: Bank Account Number
      formData.NRC_Number || "",          // Column G: NRC Number
      formData.Name || "",                // Column H: Name
      formData.Ph_No || "",               // Column I: Phone Number
      formData.RM_Collect_Amt || "",      // Column J: RM Collected Amount
      formData.RM_Service_Fee || "",      // Column K: RM Service Fee
      formData.RM_Total_Amt || "",        // Column L: RM Total Amount
      formData.RM_Buy_Rate || "",         // Column M: RM Buying Rate
      formData.MMK_Trans_Amt || "",       // Column N: MMK Transfer Amount
      "",                                 // Column O: Receipt Image links (will be updated after file upload)
      formData["မှတ်ချက်"] || "",           // Column P: Notes in Myanmar
      "",                                 // Column Q: (reserved)
      "",                                 // Column R: (reserved)
      "Not Finish",                       // Column S: Transaction Status (auto-set)
      ""                                  // Column T: Completion timestamp (empty for now)
    ];
    
    // Add new row to sheet
    sheet.appendRow(rowData);
    const newRow = sheet.getLastRow();
    
    // Generate unique ID with row number in format: TXN20250704-230747-0001
    const uniqueId = `TXN${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, '0')}${String(timestamp.getDate()).padStart(2, '0')}-${String(timestamp.getHours()).padStart(2, '0')}${String(timestamp.getMinutes()).padStart(2, '0')}${String(timestamp.getSeconds()).padStart(2, '0')}-${String(newRow).padStart(4, '0')}`;
    
    // Update the ID in the sheet
    sheet.getRange(newRow, 1).setValue(uniqueId);
    
    // Format phone number column as TEXT to preserve leading zeros
    sheet.getRange(newRow, 9).setNumberFormat("@");  // Column I: Phone Number as TEXT
    
    // Update rowData array for notifications
    rowData[0] = uniqueId;
    
    // Now upload receipt files with final ID
    let receiptImageLinks = "";
    
    // Handle base64 images
    if (base64ImageUrl) {
      receiptImageLinks = base64ImageUrl;
      rowData[14] = receiptImageLinks; // Update column O in rowData
      sheet.getRange(newRow, 15).setValue(receiptImageLinks);
      Logger.log(`📎 ✅ Base64 image URL added to sheet: ${base64ImageUrl}`);
    } else {
      Logger.log("📎 ⚠️ No files found to upload");
    }
    
    // Format MMK Transfer Amount column with number formatting
    const calculatedColumnIndex = 14; // Column N (was 15, now 14 due to reordering)
    sheet.getRange(newRow, calculatedColumnIndex).setNumberFormat("#,##0");
    
    // Also ensure phone number stays as text format to preserve leading zeros
    sheet.getRange(newRow, 9).setValue(formData.Ph_No || ""); // Re-set phone as text
    
    // Process the submitted data for notifications
    processFormSubmission(rowData, newRow);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Transaction submitted successfully!',
        id: uniqueId
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    Logger.log("Error in doPost: " + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Failed to submit transaction: ' + error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Backup function for Google Forms compatibility (if you still want to use Google Forms)
// function onFormSubmit(e) {
//   try {
//     const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
//     const lastRow = sheet.getLastRow();
//     const rowData = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];

//     // Transaction Status - auto define
//     const row = e.range.getRow();
//     const statusColumn = 19;
//     const statusCell = sheet.getRange(row, statusColumn);
//     statusCell.setValue("Not Finish");

//     // Format phone number column as TEXT to preserve leading zeros
//     sheet.getRange(row, 9).setNumberFormat("@");  // Column I: Phone Number as TEXT

//     // Total MMK numeric format alignment
//     const calculatedColumnIndex = 15;
//     sheet.getRange(lastRow, calculatedColumnIndex).setNumberFormat("#,##0");

//     // Process the submitted data for notifications
//     processFormSubmission(rowData, lastRow);
//   } catch (error) {
//     Logger.log("Error in onFormSubmit: " + error.toString());
//   }
// }

// Process form submission data and send notifications (extracted from original onFormSubmit)
function processFormSubmission(rowData, rowNumber) {

  
  const fieldMap = [
    ["ID_Number", rowData[0]],
    ["Propose_Date", rowData[1]],        // Fixed: Now column B
    ["BG", rowData[2]],
    ["MM_Bank", rowData[3]],             // Fixed: Now column D
    ["Bank_Branch", rowData[4]],
    ["Bank_Acc_No", rowData[5]],
    ["NRC_Number", rowData[6]],
    ["Name", rowData[7]],
    ["Ph_No", rowData[8]],
    ["RM_Collect_Amt", rowData[9]],
    ["RM_Service_Fee", rowData[10]],
    ["RM_Total_Amt", rowData[11]],
    ["RM_Buy_Rate", rowData[12]],
    ["MMK_Trans_Amt", rowData[13]],
    ["Receipt_Image", rowData[14]],      // Fixed: Now column O
    ["မှတ်ချက်", rowData[15]]             // Fixed: Now column P
  ];

  let receiptImageLink = "";
  const greenHighlightFields = [
    "RM_Collect_Amt",
    "RM_Buy_Rate",
    "RM_Service_Fee",
    "RM_Total_Amt",
    "MMK_Trans_Amt"
  ];

  const codeRows = [];

  fieldMap.forEach(([key, value]) => {

    const paddedKey = key === "မှတ်ချက်" ? key.padEnd(16) : key.padEnd(14);

    if (key === "Receipt_Image") {
      receiptImageLink = value;
      return;
    }

    if (key === "Propose_Date") {
      try {
        const dateObj = new Date(value);
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const day = dayNames[dateObj.getDay()];
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mon = monthNames[dateObj.getMonth()];
        const yyyy = dateObj.getFullYear();

        value = ` 🕒 ${day} ${dd} ${mon} ${yyyy}`;
      } catch (_) {
        value = "Invalid Date";
      }
      codeRows.push(`${paddedKey}:${value}`);
    }
    else if (greenHighlightFields.includes(key)) {
      const formattedValue = Number(value.toString().replace(/,/g, "")).toLocaleString("en-US");
      // Convert to bold Unicode numbers
      const boldValue = formattedValue.replace(/[0-9]/g, (digit) => {
        const boldDigits = ['𝟎', '𝟏', '𝟐', '𝟑', '𝟒', '𝟓', '𝟔', '𝟕', '𝟖', '𝟗'];
        return boldDigits[parseInt(digit)];
      });
      codeRows.push(`${paddedKey}: 💵  ${boldValue}`);
    }
    else if (key === "Ph_No") {
      codeRows.push(`${paddedKey}: 📞  ${value}`);
    }
    else if (key === "ID_Number") {
      codeRows.push(`${paddedKey}:\n🆔${value}`);
    }
    else if (key === "NRC_Number") {
      codeRows.push(`${paddedKey}:\n💳${value}`);
    }
    else if (key === "BG") {
      codeRows.push(`${paddedKey}: 🅱️  ${value}`);
    }
    else if (key === "MM_Bank") {
      codeRows.push(`${paddedKey}: 🏛️  ${value}`);
    }
    else if (key === "Bank_Branch") {
      codeRows.push(`${paddedKey}: 🔠  ${value}`);
    }
    else if (key === "Bank_Acc_No") {
      codeRows.push(`${paddedKey}: 🔢  ${value}`);
    }
    else if (key === "Name") {
      codeRows.push(`${paddedKey}: 🌝  ${value}`);
    }
    else {
      codeRows.push(`${paddedKey}: ${value}`);
    }
  });

  // Use diff syntax for green highlighting in Discord
  const codeBlock = "```\n" + codeRows.join("\n") + "\n```";


  const receiptMessage = receiptImageLink
    ? `[📎 Open Receipt](${receiptImageLink})`
    : "**Receipt_Image**: Nothing";

  const now = new Date();
  const formattedTime = now.toLocaleString("en-GB");
  const finalMessage =
    `###########################\n@everyone\n🕒 Sent at: ${formattedTime}\n💸 **New Transaction Alert**\n` +
    codeBlock + `\n` + receiptMessage;

  const recipients = [
    "raj1555kapoor@gmail.com",
    "robbobroy224@gmail.com",
    "kasi777kasi@gmail.com"
  ];
  const subject = ["New Transaction ", rowData[0]].join("-");

  // send through email
  // try {
  //   sendFormattedEmail(fieldMap, recipients, subject);
  // } catch (error) {
  //   Logger.log("Error sending email: " + error);
  //   MailApp.sendEmail({
  //     to: "kasi777kasi@gmail.com",
  //     subject: "❌ Email Sending Failed",
  //     body: error.stack || error.message
  //   });
  // }

  const formWebhookUrl = "https://discord.com/api/webhooks/1392097833447850015/9_uL_V_ktDtUDKSOhDtCevJESdFwp-tqEOBVqv1jud0wfEpiZmLV9uIMuzAAUN_C6Eqi";
  sendToDiscord(finalMessage, formWebhookUrl);
}

function sendFormattedEmail(fieldMap, recipients, subject) {
  const greenKeys = [
    "RM_Collect_Amt",
    "RM_Buy_Rate",
    "RM_Service_Fee",
    "MMK_Trans_Amt",
    "MMK_Trans_Fee",
    "MMK_Total"
  ];

  const tableRows = fieldMap.map(([key, value]) => {
    const keyLabel = key + " ~";
    let bgColor = "#fff";
    if (greenKeys.includes(keyLabel)) {
      bgColor = "#4dd12e";
    }

    return `
      <tr>
        <td style="padding: 0px 12px; border: 1.3px solid #333;"><strong>${keyLabel}</strong></td>
        <td style="padding: 0px 12px; border: 1.3px solid #333; background-color: ${bgColor};">${value}</td>
      </tr>
    `;
  }).join("");

  const htmlTable = `
    <div>
      <p style="margin-top: 0; padding-top: 0;"><strong>📩 New Transaction Submission</strong></p>
      <table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 14px; border: 2px solid #333;">
        ${tableRows}
      </table>
      <p style="margin-top: 10px;">✅ You can share this with the group.</p>
    </div>
  `;

  MailApp.sendEmail({
    to: recipients.join(","),
    subject: subject,
    htmlBody: htmlTable
  });
}

function sendToDiscord(message, webhookUrl) {
  try {
    Logger.log("🚀 Attempting to send Discord message...");
    Logger.log("📡 Webhook URL: " + webhookUrl);
    Logger.log("💬 Message length: " + message.length + " characters");
    
    const payload = JSON.stringify({ content: message });
    const options = {
      method: "post",
      contentType: "application/json",
      payload: payload
    };
    
    const response = UrlFetchApp.fetch(webhookUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log("✅ Discord response code: " + responseCode);
    Logger.log("📝 Discord response: " + responseText);
    
    if (responseCode >= 200 && responseCode < 300) {
      Logger.log("🎉 Discord message sent successfully!");
      return true;
    } else {
      Logger.log("❌ Discord API error - Code: " + responseCode + ", Response: " + responseText);
      return false;
    }
  } catch (error) {
    Logger.log("❌ Error sending Discord message: " + error.toString());
    Logger.log("🔍 Error stack: " + error.stack);
    return false;
  }
}

function onEdit(e) {
  try {

    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const editedColumn = range.getColumn();
    const editedRow = range.getRow();

    // Set V-col (22) = N-col (14) + U-col (21)
    try {
      const nValue = Number(sheet.getRange(editedRow, 14).getDisplayValue().toString().replace(/,/g, "")) || 0;
      const uValue = Number(sheet.getRange(editedRow, 21).getDisplayValue().toString().replace(/,/g, "")) || 0;
      const vValue = nValue + uValue;
      sheet.getRange(editedRow, 22).setValue(vValue);
      Logger.log(`🟢 Set V-col (22) = N-col (14) + U-col (21): ${nValue} + ${uValue} = ${vValue}`);
    } catch (calcErr) {
      Logger.log(`❌ Error setting V-col: ${calcErr}`);
    }

    // Check if this is running as an installable trigger
    if (!e || !e.source) {
      Logger.log("⚠️ WARNING: onEdit appears to be running as a simple trigger!");
      Logger.log("🔧 Please run setupInstallableEditTrigger() to enable Discord messages");
      return;
    }
    
    
    if (range.getNumRows() > 1 || range.getNumColumns() > 1) return;

    const STATUS_COL = 19; // Column S (Transaction Status)

    Logger.log(`🟡 Edited cell: R${editedRow}C${editedColumn}`);
    if (editedColumn !== STATUS_COL || editedRow === 1) return;

    const newValue = range.getDisplayValue().toString().trim();
    Logger.log(`🔍 New value: "${newValue}"`);

    if (newValue === "Finished" || newValue === "Cancel") {
      Logger.log("✅ Matched condition, sending Discord message");

      // Set current datetime in Column T (20th column) with 12hr format and seconds
      const now = new Date();

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      const day = dayNames[now.getDay()];
      const dd = String(now.getDate()).padStart(2, '0');
      const mon = monthNames[now.getMonth()];
      const yyyy = now.getFullYear();

      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const hh = String(hours).padStart(2, '0');

      const dateString = `${day} ${dd} ${mon} ${yyyy} ${hh}:${minutes}:${seconds} ${ampm}`;

      sheet.getRange(editedRow, 20).setValue(dateString); // Column T (completion timestamp)

      // Set Month (3-letter) and Year in columns Q and R
      sheet.getRange(editedRow, 17).setValue(mon);        // Column Q: Month (Jul)
      sheet.getRange(editedRow, 18).setValue(yyyy);       // Column R: Year (2025)


      // Get all field values (updated column positions)
      const id = sheet.getRange(editedRow, 1).getDisplayValue();              // Column A
      const propose_date = sheet.getRange(editedRow, 2).getDisplayValue();    // Column B  
      const business_group = sheet.getRange(editedRow, 3).getDisplayValue();  // Column C
      const myanmar_bank = sheet.getRange(editedRow, 4).getDisplayValue();    // Column D
      const township_bank_branch = sheet.getRange(editedRow, 5).getDisplayValue(); // Column E
      const bank_acc_number = sheet.getRange(editedRow, 6).getDisplayValue(); // Column F
      const nrc_number = sheet.getRange(editedRow, 7).getDisplayValue();      // Column G
      const name = sheet.getRange(editedRow, 8).getDisplayValue();            // Column H
      const phone_number = sheet.getRange(editedRow, 9).getDisplayValue();    // Column I
      const rm_collected_amount = sheet.getRange(editedRow, 10).getDisplayValue(); // Column J
      const rm_service_fee = sheet.getRange(editedRow, 11).getDisplayValue(); // Column K
      const rm_total_amount = sheet.getRange(editedRow, 12).getDisplayValue(); // Column L
      const rm_buying_rate = sheet.getRange(editedRow, 13).getDisplayValue(); // Column M
      const mmk_transfer_amount = sheet.getRange(editedRow, 14).getDisplayValue(); // Column N
      const mmk_trans_fee = sheet.getRange(editedRow, 21).getDisplayValue();  // Column U: MMK Trans Fee
      const mmk_total = sheet.getRange(editedRow, 22).getDisplayValue();      // Column V: MMK Total

      // Format current date and time (now using propose_date from column B)
      let dateTimeValue = propose_date;
      try {
        const dateObj = new Date(dateTimeValue);
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const day = dayNames[dateObj.getDay()];
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mon = monthNames[dateObj.getMonth()];
        const yyyy = dateObj.getFullYear();
        dateTimeValue = `🕒 ${day} ${dd} ${mon} ${yyyy}`;
      } catch (_) {
        dateTimeValue = "Invalid Date";
      }

      // Helper function to format financial values with bold Unicode numbers
      const formatFinancialValue = (value) => {
        const formattedValue = Number(value.toString().replace(/,/g, "")).toLocaleString("en-US");
        // Convert to bold Unicode numbers
        const boldValue = formattedValue.replace(/[0-9]/g, (digit) => {
          const boldDigits = ['𝟎', '𝟏', '𝟐', '𝟑', '𝟒', '𝟓', '𝟔', '𝟕', '𝟖', '𝟗'];
          return boldDigits[parseInt(digit)];
        });
        return `💵  ${boldValue}`;
      };

      // Create field map with consistent formatting
      const fieldMap = [
        ["ID_Number", `🆔${id}`],
        ["Propose_Date", dateTimeValue],
        ["BG", `🅱️  ${business_group}`],
        ["MM_Bank", `🏛️  ${myanmar_bank}`],
        ["Bank_Branch", `🔠  ${township_bank_branch}`],
        ["Bank_Acc_No", `🔢  ${bank_acc_number}`],
        ["NRC_Number", `\n💳${nrc_number}`],
        ["Name", `🌝  ${name}`],
        ["Ph_No", `📞  ${phone_number}`],
        ["RM_Collect_Amt", formatFinancialValue(rm_collected_amount)],
        ["RM_Service_Fee", formatFinancialValue(rm_service_fee)],
        ["RM_Total_Amt", formatFinancialValue(rm_total_amount)],
        ["RM_Buy_Rate", formatFinancialValue(rm_buying_rate)],
        ["MMK_Trans_Amt", formatFinancialValue(mmk_transfer_amount)],
        ["MMK_Trans_Fee", formatFinancialValue(mmk_trans_fee)],
        ["MMK_Total", formatFinancialValue(mmk_total)],
        ["Status", `💡  ${newValue} on ${dateString}`]
      ];

      // Build code rows with consistent padding
      const codeRows = [];
      fieldMap.forEach(([key, value]) => {
        const paddedKey = key.padEnd(14);
        if (key === "ID_Number") {
          codeRows.push(`${paddedKey}:\n${value}`);
        } else {
          codeRows.push(`${paddedKey}: ${value}`);
        }
      });

      // Create the final message with consistent formatting
      const codeBlock = "```\n" + codeRows.join("\n") + "\n```";
      const message = `@everyone\n✅ Transaction Updated!\n${codeBlock}`;

      Logger.log("📤 Sending message:\n" + message);
      const editWebhookUrl = "https://discord.com/api/webhooks/1392098339289301002/QIXN7O0cteVMJglnc_JImKRLDsWV77o4FkQ3oMPv8s6UHN1WkpdeDy3deyZ5rrExgcOO";
      sendToDiscord(message, editWebhookUrl);
    } else {
      Logger.log(`❌ Value "${newValue}" did not match target list (Finished/Cancel)`);
    }
  } catch (error) {
    Logger.log("❌ Error in onEdit: " + error.toString());
    Logger.log("Error stack: " + error.stack);
  }
}

// Handle HTTP GET requests (when someone visits the web app URL)
function doGet(e) {
  return HtmlService.createTemplateFromFile('form').evaluate()
    .setTitle('Money Transfer (Malay ⇄ Myanmar)')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}



// Helper function to get specific folder by ID in Google Drive
function getSpecificFolder(folderId) {
  try {
    Logger.log(`📁 Attempting to access folder with ID: ${folderId}`);
    const folder = DriveApp.getFolderById(folderId);
    Logger.log(`📁 Successfully accessed folder: ${folder.getName()}`);
    return folder;
  } catch (error) {
    Logger.log("⚠️ Error accessing folder with ID: " + folderId + " - " + error.toString());
    
    // Fallback: try to find the folder by URL or create a new folder
    try {
      Logger.log("📁 Trying fallback: creating 'Receipt_Images' folder in root");
      return getOrCreateFolder("Receipt_Images");
    } catch (fallbackError) {
      Logger.log("⚠️ Fallback also failed: " + fallbackError.toString());
      throw new Error("Could not access any folder for file storage. Please check Google Drive permissions in Apps Script settings.");
    }
  }
}

// Helper function to get or create a folder in Google Drive (kept for backward compatibility)
function getOrCreateFolder(folderName) {
  try {
    Logger.log(`📁 Looking for folder: ${folderName}`);
    
    if (!folderName || folderName.trim() === "") {
      throw new Error("Folder name cannot be empty");
    }
    
    const folders = DriveApp.getFoldersByName(folderName);
    if (folders.hasNext()) {
      const folder = folders.next();
      Logger.log(`📁 Found existing folder: ${folder.getName()}`);
      return folder;
    } else {
      Logger.log(`📁 Creating new folder: ${folderName}`);
      const newFolder = DriveApp.createFolder(folderName);
      Logger.log(`📁 Created folder with ID: ${newFolder.getId()}`);
      return newFolder;
    }
  } catch (error) {
    Logger.log(`⚠️ Error in getOrCreateFolder: ${error.toString()}`);
    throw error;
  }
}

// Helper function to include HTML files
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}



// Process base64 image data exactly like the sample code
function processBase64Upload(data, mimetype, filename) {
  // Constants
  const RECEIPT_FOLDER_ID = "13XWHd0cxQ0k6lQgrQ8vixOTtOHnmUWD_";
  
  try {
    console.log(`📎 Processing base64 upload: Name=${filename}, Type=${mimetype}`);
    console.log(`📎 Base64 data length: ${data ? data.length : 0} characters`);
    
    if (!data || data.length === 0) {
      console.log("📎 No base64 data to process");
      return "";
    }
    
    // Decode base64 data exactly like the sample: Utilities.base64Decode(e.parameters.data)
    const decodedData = Utilities.base64Decode(data);
    console.log(`📎 Decoded data size: ${decodedData.length} bytes`);
    
    // Create blob exactly like the sample: Utilities.newBlob(data, e.parameters.mimetype, e.parameters.filename)
    const blob = Utilities.newBlob(decodedData, mimetype, filename);
    console.log(`📎 Created blob: ${blob.getName()}, size: ${decodedData.length} bytes, type: ${blob.getContentType()}`);
    
    // Get the target folder for receipt images
    const folder = getSpecificFolder(RECEIPT_FOLDER_ID);
    console.log(`📎 Target folder: ${folder.getName()}`);
    
    // Generate a unique filename with timestamp to avoid conflicts
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss");
    const fileExtension = filename.split('.').pop() || 'jpg';
    const baseName = filename.replace(/\.[^/.]+$/, ""); // Remove extension
    const uniqueFileName = `${baseName}_${timestamp}_${Math.floor(Math.random() * 1000)}.${fileExtension}`;
    
    // Create file exactly like the sample: DriveApp.createFile(blob) but in specific folder
    const file = folder.createFile(blob.setName(uniqueFileName));
    console.log(`📎 File created in Drive: ${file.getName()}, ID: ${file.getId()}`);
    
    // Set sharing permissions to make it publicly viewable
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    console.log(`📎 File sharing set to public view`);
    
    // Generate the public view URL
    const publicUrl = `https://drive.google.com/file/d/${file.getId()}/view?usp=sharing`;
    console.log(`📎 Public URL generated: ${publicUrl}`);
    
    console.log(`📎 ====== BASE64 UPLOAD COMPLETED ======`);
    return publicUrl;
    
  } catch (error) {
    console.log(`📎 ❌ ====== ERROR IN BASE64 UPLOAD ======`);
    console.log(`📎 Error details: ${error.toString()}`);
    console.log(`📎 Error stack: ${error.stack || 'No stack trace available'}`);
    throw error;
  }
}




