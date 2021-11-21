#nullable enable

using System;
using System.Diagnostics.CodeAnalysis;
using System.Runtime.Serialization;

namespace GitWebLinks;

[Serializable]
[SuppressMessage("Design", "CA1032:Implement standard exception constructors", Justification = "Internal use only.")]
public class NoRemoteHeadException : Exception {

    public NoRemoteHeadException(string message) : base(message) { }


    protected NoRemoteHeadException(SerializationInfo info, StreamingContext context) : base(info, context) { }

}
