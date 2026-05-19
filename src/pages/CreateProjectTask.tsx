import { useState } from "react";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../../services/AuthProvider";
import { CreateTask } from "../../services/api";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";

const CreateProjectTask = () => {

    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const { token } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const project_id = location.state?.project_id || null;

    const { register, handleSubmit } = useForm({
        defaultValues: {
            name: "",
            start: "",
            end: "",
            description: ""
        }
    });

    const onTaskCreate = async (data) => {
        try {
            const success = await CreateTask(token, project_id, data);
            if (success) {
                toast.success("Task created successfully!");
                navigate(-1);
            } else {
                toast.error("Failed to create task.");
            }
        } catch (error) {
            console.log("Error creating task:", error);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Sidebar onCollapseChange={setSidebarCollapsed} />
            <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col`}>
                <Header />

                <main className="flex-1 p-6 space-y-6">
                    <DynamicBreadCrumb />

                    <form onSubmit={handleSubmit(onTaskCreate)} className="flex flex-row gap-12">
                        <div className="flex flex-col flex-wrap flex-1">
                            <h2 className="text-lg font-semibold mb-6">Create New Task</h2>

                            <div className="flex gap-6 mb-6">
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="name">Name</Label>
                                    <Input id="name" type="text" {...register("name")} />
                                </div>
                            </div>

                            <div className="flex gap-6 mb-6">
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="start">Start Date</Label>
                                    <Input id="start" type="date" {...register("start")} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="end">End Date</Label>
                                    <Input id="end" type="date" {...register("end")} />
                                </div>
                            </div>

                            <div className="mb-6 space-y-1">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" {...register("description")} placeholder="Add task description here..." rows={6} />
                            </div>

                            <div className="flex justify-end gap-3 mt-auto">
                                <Button type="submit">Create Task</Button>
                            </div>
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
};

export default CreateProjectTask;
