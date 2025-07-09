# money_transfer
Malay-Myanmar money transfer automation through Form and Gsheet using appscript.
Open Gsheet then head to extension tab , there is appscript editor.

- copy all the code from (code.gs) and paste it appscript's code.gs file.

- copy all the code from (form.html) and create a form.html fiel in appscripts and paste in it.

- Go to project setting(left nav bar) check 'Show "appsscript.json" manifest file in editor'. And copy all the code and paste in it.

- Add a onEdit trigeer, click Trigger (from left nav bar) add trigger.
Set the parameters as according- onEdit,Head,From spreadsheet,On edit.
After all save it and deploy as Webapp.

- (Remainder if u wanna create new one , need to change)
  - action para in [form tag] in form.html file to corresponding webappurl you deploy.
  - formWebhookUrl in code.gs file (which is discord webhookurl) for record save.
  - editWebhookurl in code.gs file (which is discord webhookurl) for edit.
  - RECEIPT_FOLDER_ID in code.gs [create a folder in drive and copy its id here]

Don't forget to copy the Gsheet's column row as it is and paste it in your sheet.
