# owtsharks
A machine learning project to conserve oceanic white tip shark population. 
It analyzes the video feed from fishing vessels to ensure proper handling of the endagered species.
This tutorial is a demo of how to use Azure ML for video feeds.

The project consists the following parts.

* Training the model in Azure ML
* Deploying the model to a kubernetes cluster.
* Analyzing the videos against the model and generate metadata output.
* A media player that can overlay the metadata along with the video for visualization.


# Technology
1. Azure ML - Used for training the model and deploying the model to a cluster for analysis.
2. Ffmpeg - Used to extract the video frames from a video. The frames can be used either as training data or as inputs for the analysis.
3. Media Player - A simple HTML/CSS/Javascript based media player that can play MP4 files and overlay the metadata along with the video.
