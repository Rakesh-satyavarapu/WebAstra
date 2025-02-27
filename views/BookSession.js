import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

const BookSession = () => {
    const { mentorId } = useParams();
    const [mentor, setMentor] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTimeSlot, setSelectedTimeSlot] = useState("");

    useEffect(() => {
        const fetchMentorDetails = async () => {
            try {
                const response = await axios.get(`/api/mentors/${mentorId}`);
                setMentor(response.data);
                setAvailableSlots(response.data.availableSlots || []);
            } catch (error) {
                console.error("Error fetching mentor details", error);
            }
        };

        fetchMentorDetails();
    }, [mentorId]);

    const handleBookSession = async () => {
        if (!selectedDate || !selectedTimeSlot) {
            alert("Please select a date and time slot.");
            return;
        }

        try {
            await axios.post("/api/book-session", {
                mentorId,
                date: selectedDate,
                timeSlot: selectedTimeSlot,
            });

            alert("Session booked successfully!");
        } catch (error) {
            console.error("Error booking session", error);
        }
    };

    return (
        <div className="container">
            {mentor && (
                <h2>Book a Session with {mentor.firstname} {mentor.lastname}</h2>
            )}
            <div className="calendar-container">
                <h4>Select a Date</h4>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                />
            </div>

            <div className="slots-container">
                <h4>Available Time Slots</h4>
                {availableSlots.length > 0 ? (
                    availableSlots.map((slot, index) => (
                        <button
                            key={index}
                            className={`slot-btn ${selectedTimeSlot === slot ? "selected" : ""}`}
                            onClick={() => setSelectedTimeSlot(slot)}
                        >
                            {slot}
                        </button>
                    ))
                ) : (
                    <p>No slots available</p>
                )}
            </div>

            <button className="book-btn" onClick={handleBookSession}>
                Confirm Booking
            </button>
        </div>
    );
};

export default BookSession;
