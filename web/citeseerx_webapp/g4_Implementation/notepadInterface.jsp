<!-- The purpose of this jsp file is to let any user create a note and save it into the Downloads folder -->

<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>My Notepad</title>
    <style>
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            font-family: sans-serif;
        }
        textarea {
            width: 100%;
            height: 400px;
            padding: 5px;
            margin-top: 10px;
        }
        input[type="text"] {
            width: 100%;
            padding: 5px;
            margin-top: 10px;
        }
        button {
            margin-top: 10px;
            padding: 10px 20px;
        }
        .note-info {
            font-style: italic;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>My Notepad</h1>
        <div class="note-info">
            <span id="noteDateTime"></span>
        </div>
        <textarea id="notepadText" onfocus="clearPlaceholder()">Enter your note here...</textarea>
        <br>
        <input type="text" id="fileName" placeholder="Enter file name">
        <button onclick="saveText()">Save</button>
    </div>

    <script>
        // Function to set a placeholder for the 'textarea' component
        function clearPlaceholder() {
            var textarea = document.getElementById('notepadText');
            if (textarea.value === 'Enter your note here...') {
                textarea.value = '';
            }
        }

        // Function to save the note into the Downloads folder
        function saveText() {
            var text = document.getElementById('notepadText').value;
            var fileName = document.getElementById('fileName').value || 'note.txt'; // Use default name if empty
            
            // Get the current date and time
            var dateTime = new Date().toLocaleString();

            // Append the date and time at the beginning of the note
            var noteContent = dateTime + "\n\n" + text;

            // Create a Blob object with the note content
            var blob = new Blob([noteContent], { type: 'text/plain' });

            // Create an anchor element to download the Blob
            var a = document.createElement('a');
            a.href = window.URL.createObjectURL(blob);
            a.download = fileName; // Specify the file name

            // Programmatically click the anchor element to trigger the download
            a.click();

            // Clean up
            window.URL.revokeObjectURL(a.href);
        }

        // Display current date and time when the page loads
        document.getElementById('noteDateTime').innerText = new Date().toLocaleString();
    </script>
</body>
</html>