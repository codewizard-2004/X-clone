import Post  from "../models/post.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { v2 as cloud } from "cloudinary";


export const createPost = async (req, res) => {
    try {
        const {text} = req.body;
        let {img} = req.body;
        const userId = req.user._id.toString();

        const user = await User.findById(userId);

        if(!user) return res.status(404).json({message:"User not found"});
        if(!text && !img) return res.status(400).json({message: "Please provide text or image"});

        if(img){
            const uploadedResponse = await cloud.uploader.upload(img);
            img = uploadedResponse.secure_url;
        }

        const newPost = new Post({
            user: userId,
            text,
            img,
        })

        await newPost.save();
        res.status(201).json(newPost)
    } catch (error) {
        console.log("error in create post:" , error.message);
        res.status(500).json({message: "Internal server error"});
        
    }
}

export const deletePost = async(req , res)=>{
    try {
        const post = await Post.findById(req.params.id);
        if(!post) return res.status(404).json({message: "Post not found"});

        if(post.user.toString() !== req.user._id.toString()){
            return res.status(401).json({message: "You are not authorized to delete this post"});
        }

        if(post.img){
            const imgId = post.img.split("/").pop().split(".")[0];
            await cloud.uploader.destroy(imgId);
        }

        await Post.findByIdAndDelete(req.params.id);
        res.status(200).json({message: "Post deleted successfully"});
    } catch (error) {
        console.log("error in delete post:" , error.message);
        res.status(500).json({message: "Internal server error"});
        
    }
}

export const commentOnPost = async(req , res)=>{
    try {
        const text = req.body;
        console.log(text)
        const postId = req.params.id;
        const userId = req.user._id;

        if(!text) return res.status(400).json({message: "Please provide text"});
        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({message: "Post not found"});
        const newComment = {
            text: text.text,
            user: userId,
        }
        post.comments.push(newComment);
        await post.save();
        res.status(201).json(post);

    } catch (error) {
        console.log("error in commentOnPost:" , error.message);
        res.status(500).json({message: "Internal server error"});
    }
}

export const likeUnlikePost = async(req , res)=> {
    try {
        const {id:postId} = req.params;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if(!post) return res.status(404).json({message: "Post not found"});

        const isLiked = post.likes.includes(userId);
        if(isLiked){
            await Post.updateOne({_id:postId}, {$pull: {likes: userId}});
            await User.updateOne({_id:post.user}, {$pull:{likedPosts: postId}});
            
            const updatedLikes = post.likes.filter((id)=> id.toString() !== userId.toString());
            res.status(200).json(updatedLikes);
        } else {
            post.likes.push(userId);
            await User.updateOne({_id:post.user}, {$push:{likedPosts: postId}});
            await post.save();

            const notification = new Notification({
                from: userId,
                to: post.user,
                type:"like",
            });

            await notification.save();
            const updatedLikes = post.likes
            res.status(200).json(updatedLikes);
        }
    } catch (error) {
        console.log("error in likeUnlikePost:" , error.message);
        res.status(500).json({message: "Internal server error"});
    }
}

export const getAllPosts = async(req , res)=> {
    try {
        const posts = await Post.find().sort({createdAt: -1}).populate({
            path: "user",
            select: "-password",
        }).populate({
            path: "comments.user",
            select: "-password"
        });

        if(posts.length === 0) return res.status(200).json([]);

        res.status(200).json(posts);

    } catch (error) {
        console.log("error in getAllPosts:" , error.message);
        res.status(500).json({message: "Internal server error"});
    }
}

export const getLikedPosts = async(req , res)=> {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);
        if(!user) return res.status(404).json({message: "User not found"});

        const likedPosts = await Post.find({_id:{ $in: user.likedPosts}}).populate({
            path: "user",
            select: "-password",
        }).populate({
            path: "comments.user",
            select: "-password"
        })

        res.status(200).json(likedPosts);
    } catch (error) {
        console.log("error in getLikedPosts:" , error.message);
        res.status(500).json({message: "Internal server error"});
        
    }
}

export const getFollowingPosts = async(req , res)=>{
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        if(!user) return res.status(404).json({error:"User not found"})
        
        const following = user.following;

        const feedPosts = await Post.find({user: { $in: following}}).sort({createdAt: -1}).populate({
            path:"user",
            select: "-password"
        }).populate({
            path:"comments.user",
            select: "-password",
        })
        
        res.status(200).json(feedPosts);
        
    } catch (error) {
        console.log("error in getFollowingPosts:" , error.message);
        res.status(500).json({message: "Internal server error"});
    }
}

export const getUserPosts = async(req , res)=>{
    try {
        const {username}= req.params;
        const user = await User.findOne({username});

        if(!user) return res.status(404).json({error: "User not found"})
        
        const posts = await Post.find({user: user._id}).sort({createdAt: -1}).populate({
            path:"user",
            select: "-password",
        }).populate({
            path: "comments.user",
            select: "-password",
        });

        res.status(200).json(posts)
    } catch (error) {
        console.log("error in getUserPosts:" , error.message);
        res.status(500).json({message: "Internal server error"});
    }
}