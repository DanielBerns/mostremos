# First draft

## Prompt 1

You are a senior software developer with many years of experience. Prepare a first draft of an interview (asking all the questions needed to fiil the gaps about specifications) for a customer sending you the following message:

"I want a system for collecting images and posts with text format from a large number of registered users in a given location, using their smartphones. Photos must have latitude and longitude from the smartphone. I want to aggregate images and text posts and produce reports (for example, how many photos show potholes in streets; how many photos show stray dogs; photos about prices at supermarkets; how many posts with a given tag; how many photos with a given tag; temporal distribution of a given tag; etc)".

## Answer 1

### Subject: Discovery & Requirements for Your Crowdsourced Data Platform

A crowdsourced, location-based data collection system is a powerful tool for civic and commercial reporting. 

To ensure we design a system that is robust, scalable, and exactly meets your needs, I have prepared a few questions. These will help us define the scope, especially regarding how the data is processed between the moment a user takes a photo and when it appears on your dashboard.

### 1. User Application & Experience
* **Platform Preference:** I prefer a Progressive web app.
* **Offline Capabilities:** Users may be reporting from areas with poor cellular reception. We need the app to store photos and posts offline and automatically sync them when the connection is restored.
* **User Motivation & Security:** The app will be open to the general public. The first set of users will be a closed group, but the long term goal is an open app for all users, so we need mechanisms to prevent spam or malicious uploads.

### 2. Data Processing & Classification
* **Manual vs. Automated Tagging:** In the first version, users will manually select the tags from a dropdown whenn they post, but the long term goal is  to automatically analyze the image and apply tags (e.g., using computer vision).
* **Data Extraction:** The idea is that users will report a supermarket price photo: in the first version, the user will report the photo, and manually provide the extracted data (supermarket name, timestamp, article, and price). As a long term goal, For the supermarket price photos, the system will read and extract the text/numbers from the image (OCR) into a structured database automatically.
* **Location Constraints:** You mentioned operating in "a given location." Do we need to build "geo-fencing" to automatically reject or flag photos that are taken outside of this specific municipality or region? 
* **Location Accuracy:** The system explicitly block users who have disabled GPS or are attempting to spoof their location.

### 3. Reporting & Analytics
* **Real-time vs. Batch:** A daily/hourly aggregated report is sufficient.
* **Dashboard Access:** We need different access levels (e.g., an admin who sees everything, editors who produce reports with aggregated data and remarks, and a public view that only sees heatmaps.
* **Data Retention:** The frontend will be hosted in a public server with several limitations of ram and disk space, however a more powerful and non public computer may download data from the public server and upload reports day by day.

### 4. Scale & Performance Expectations
* **Volume:** I expect 10000 users uploading up to five photos and posts by day.
* **Peak Loads:** May be one or two peak loads by month (20000 users uploading up to ten photos and post by day)


